import { ContainerModule } from "inversify";

import { IpcServiceProvider } from "$main/pal";

import { AccountService } from "./AccountService.mjs";
import { DefaultJobSchedulingService } from "./DefaultJobSchedulingService.mjs";
import { JobSchedulingService } from "./JobSchedulingService.mjs";

export const AppModule = new ContainerModule((bind) => {
  bind(IpcServiceProvider).to(AccountService).inRequestScope();
  bind(JobSchedulingService).to(DefaultJobSchedulingService).inSingletonScope();
});