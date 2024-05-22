import { ContainerModule, injectable } from "inversify";

import { RemoteProcedureServer } from "$ipc/core";

import { MainIpcServer } from "./index.mjs";
import {
  MainIpcServer as MainIpcServerImpl,
  RemoteProcedureServerInjectionSymbol,
} from "./MainIpcServer.mjs";

export const PalIpcModule = new ContainerModule((bind) => {
  bind<RemoteProcedureServer>(RemoteProcedureServerInjectionSymbol)
    .to(injectable()(RemoteProcedureServer))
    .inSingletonScope();

  bind(MainIpcServer).to(MainIpcServerImpl).inSingletonScope();
});
