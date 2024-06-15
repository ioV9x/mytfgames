import { ContainerModule, injectable } from "inversify";

import {
  DefaultRemoteReduxActionSender,
  RemoteProcedureServer,
} from "$ipc/core";

import { MainIpcServer, RemoteReduxActionSender } from "./index.mjs";
import {
  MainIpcServer as MainIpcServerImpl,
  RemoteProcedureServerInjectionSymbol,
} from "./MainIpcServer.mjs";

export const PalIpcModule = new ContainerModule((bind) => {
  bind<RemoteProcedureServer>(RemoteProcedureServerInjectionSymbol)
    .to(injectable()(RemoteProcedureServer))
    .inSingletonScope();
  bind(RemoteReduxActionSender)
    .to(injectable()(DefaultRemoteReduxActionSender))
    .inRequestScope();

  bind(MainIpcServer).to(MainIpcServerImpl).inSingletonScope();
});
