import { ContainerModule } from "inversify";

import { RemoteProcedureServer } from "$pure-base/ipc";

import {
  IpcServer,
  RemoteProcedureServerInjectionSymbol,
  WorkerIpcServer,
} from "./WorkerIpcServer.mjs";

export const PalIpcModule = new ContainerModule(({ bind }) => {
  bind<RemoteProcedureServer>(RemoteProcedureServerInjectionSymbol)
    .toResolvedValue(() => new RemoteProcedureServer())
    .inSingletonScope();

  bind(IpcServer).to(WorkerIpcServer).inSingletonScope();
});
