import { ContainerModule } from "inversify";

import { IpcServiceProvider } from "$main/pal";

import { AccountService } from "./AccountService.mjs";

export const AppModule = new ContainerModule((bind) => {
  bind(IpcServiceProvider).to(AccountService).inRequestScope();
});
