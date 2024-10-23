import type EventEmitter from "node:events";

import type { Temporal } from "temporal-polyfill";

import { makeServiceIdentifier } from "$node-base/utils";

export interface Job {
  readonly id: string;

  run(signal: AbortSignal): Promise<void> | void;
}

export interface JobEmitterEvents {
  created: [job: Job[] | Job];
}
export interface JobEmitter extends EventEmitter<JobEmitterEvents> {
  readonly scheduleName: string;
  readonly maxJobConcurrency: number;
}

export interface JobSchedule {
  readonly scheduleName: string;
  readonly scheduleCheckInterval: Temporal.Duration;
  readonly runOnStart?: boolean;
  readonly maxJobConcurrency: number;

  checkSchedule(): Promise<Job[]> | Job[];
}

type JobSource = JobSchedule | JobEmitter | (JobEmitter & JobSchedule);
const JobSource = makeServiceIdentifier<JobSource>("job source");
export { JobSource };

export function isJobSchedule(
  source: JobSource,
): source is JobSchedule | (JobEmitter & JobSchedule) {
  return "scheduleCheckInterval" in source;
}
export function isJobEmitter(
  source: JobSource,
): source is JobEmitter | (JobEmitter & JobSchedule) {
  return "addListener" in source;
}
