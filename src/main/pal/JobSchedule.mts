import { Temporal } from "temporal-polyfill";

import { makeServiceIdentifier } from "$main/utils";

export interface Job {
  readonly id: string;

  run(): Promise<void> | void;
}
interface JobSchedule {
  readonly scheduleName: string;
  readonly scheduleCheckInterval: Temporal.Duration;
  readonly runOnStart?: boolean;
  readonly maxJobConcurrency: number;

  checkSchedule(): Promise<Job[]> | Job[];
}
const JobSchedule = makeServiceIdentifier<JobSchedule>("job schedule");
export { JobSchedule };
