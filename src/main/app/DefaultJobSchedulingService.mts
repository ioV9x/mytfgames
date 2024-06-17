import { injectable, multiInject } from "inversify";
import { Temporal } from "temporal-polyfill";
import { isPromise } from "util/types";

import { Logger, logger } from "$main/log";
import { Job, JobSchedule } from "$main/pal";
import { makeAggregatedError } from "$main/utils";

import { JobSchedulingService } from "./JobSchedulingService.mjs";

type JobMap = Partial<Record<string, Job>>;

class JobScheduleTracker {
  readonly #log: Logger;
  readonly #jobs: JobMap;
  readonly #waitQueue: Job[];
  #semaphore: number;
  lastRun: Temporal.Instant;
  nextRun: Temporal.Instant;

  readonly queueJobs: (jobs: Job[]) => void;
  readonly runJob: (job: Job) => void;

  constructor(
    log: Logger,
    readonly schedule: JobSchedule,
    now: Temporal.Instant,
  ) {
    this.#log = log;
    this.#jobs = Object.create(null) as JobMap;
    this.#waitQueue = [];
    this.#semaphore = schedule.maxJobConcurrency;
    this.lastRun = Temporal.Instant.fromEpochMilliseconds(0);
    this.nextRun = schedule.runOnStart
      ? now
      : now.add(schedule.scheduleCheckInterval);

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.runJob = this.$runJob.bind(this);
    this.queueJobs = this.$queueJobs.bind(this);
  }

  checkSchedule(now: Temporal.Instant): Promise<Job[]> | Job[] {
    if (Temporal.Instant.compare(now, this.nextRun) < 0) {
      return [];
    }

    const jobs = this.schedule.checkSchedule();
    if (isPromise(jobs)) {
      void jobs.then(() => {
        this.lastRun = now;
        this.nextRun = now.add(this.schedule.scheduleCheckInterval);
      });
    } else {
      this.lastRun = now;
      this.nextRun = now.add(this.schedule.scheduleCheckInterval);
    }
    return jobs;
  }

  private $queueJobs(jobs: Job[]): void {
    this.#log.debug(
      `Queueing ${jobs.length} jobs for ${this.schedule.scheduleName}`,
    );
    for (const job of jobs) {
      if (job.id in this.#jobs) {
        this.#log.warn(
          `Job ${this.schedule.scheduleName}/${job.id} is already scheduled; skipping duplicate scheduling`,
        );
        continue;
      }
      this.#jobs[job.id] = job;
      if (this.#semaphore !== 0) {
        this.continueWith(job);
      } else {
        this.#waitQueue.push(job);
      }
    }
  }
  private async $runJob(job: Job): Promise<void> {
    try {
      const result = job.run();
      if (isPromise(result)) {
        await result;
      }
    } catch (error) {
      this.#log.error({
        err: error,
        job: `${this.schedule.scheduleName}/${job.id}`,
      });
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.#jobs[job.id];
      ++this.#semaphore;

      const nextJob = this.#waitQueue.shift();
      if (nextJob !== undefined) {
        this.continueWith(nextJob);
      }
    }
  }
  private continueWith(job: Job): void {
    setImmediate(this.runJob, job);
    --this.#semaphore;
  }
}

export class AggregatedError extends Error {
  constructor(readonly causes: readonly unknown[]) {
    super("Multiple errors occurred");
  }
}

/**
 * The default implementation of the job scheduling service.
 *
 * This service is responsible for managing the scheduling and execution of jobs.
 * However, it does not 'tick' itself; the application is responsible for calling
 * the `tick` method at regular intervals in order to ease testing.
 */
@injectable()
export class DefaultJobSchedulingService implements JobSchedulingService {
  readonly #log: Logger;
  readonly #schedules: JobScheduleTracker[];

  readonly tickInterval = Temporal.Duration.from({ seconds: 60 });

  constructor(
    @logger("scheduler") log: Logger,
    @multiInject(JobSchedule) jobSchedules: JobSchedule[],
  ) {
    this.#log = log;
    const now = Temporal.Now.instant();
    this.#schedules = jobSchedules.map(
      (schedule) => new JobScheduleTracker(log, schedule, now),
    );
  }

  async tick(): Promise<void> {
    this.#log.debug("Ticking job scheduler");
    const now = Temporal.Now.instant();

    const asyncSchedules: [JobScheduleTracker, Promise<Job[]>][] = [];

    let numSyncSchedules = 0;
    let numAsyncSchedules = 0;
    for (const scheduleTracker of this.#schedules) {
      if (Temporal.Instant.compare(now, scheduleTracker.nextRun) < 0) {
        continue;
      }
      try {
        const jobs = scheduleTracker.checkSchedule(now);
        if (isPromise(jobs)) {
          asyncSchedules.push([scheduleTracker, jobs]);
          ++numAsyncSchedules;
        } else {
          scheduleTracker.queueJobs(jobs);
          ++numSyncSchedules;
        }
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        asyncSchedules.push([scheduleTracker, Promise.reject(error)]);
        ++numSyncSchedules;
      }
    }
    if (asyncSchedules.length === 0) {
      this.#log.debug(
        `Examined ${numSyncSchedules} schedules synchronously and none asynchronously`,
      );
      return;
    }

    const results = await Promise.allSettled(
      asyncSchedules.map(([schedule, jobs]) => jobs.then(schedule.queueJobs)),
    );
    this.#log.debug(
      `Examined ${numSyncSchedules} schedules synchronously and ${numAsyncSchedules} schedules asynchronously`,
    );

    const failures: unknown[] = [];
    for (let i = 0; i < asyncSchedules.length; ++i) {
      const [scheduleState] = asyncSchedules[i]!;
      const result = results[i]!;
      if (result.status === "rejected") {
        this.#log.error({
          err: result.reason as unknown,
          msg: `Failed to schedule ${scheduleState.schedule.scheduleName}`,
        });

        failures.push(result.reason);
      }
    }
    if (failures.length > 0) {
      throw makeAggregatedError(failures);
    }
  }
}
