import { ContainerModule, injectable } from "inversify";

import { RemoteProcedureServer } from "$pure-base/ipc";

import {
  IpcServer,
  RemoteProcedureServerInjectionSymbol,
  WorkerIpcServer,
} from "./WorkerIpcServer.mjs";

export const PalIpcModule = new ContainerModule((bind) => {
  bind<RemoteProcedureServer>(RemoteProcedureServerInjectionSymbol)
    .to(injectable()(RemoteProcedureServer))
    .inSingletonScope();

  bind(IpcServer).to(WorkerIpcServer).inSingletonScope();
});
