import { Temporal } from "temporal-polyfill";

import { makeServiceIdentifier } from "$node-base/utils";

interface JobSchedulingService {
  readonly tickInterval: Temporal.Duration;

  tick(): Promise<void>;
}
const JobSchedulingService = makeServiceIdentifier<JobSchedulingService>(
  "job scheduling service",
);
export { JobSchedulingService };
