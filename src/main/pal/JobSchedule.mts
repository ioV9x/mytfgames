import { Temporal } from "temporal-polyfill";

import { makeServiceIdentifier } from "$node-base/utils";

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
