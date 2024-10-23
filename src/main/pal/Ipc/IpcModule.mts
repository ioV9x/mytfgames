import { ContainerModule, injectable } from "inversify";

import {
  DefaultRemoteReduxActionSender,
  RemoteProcedureServer,
} from "$pure-base/ipc";

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
    .inSingletonScope();

  bind(MainIpcServer).to(MainIpcServerImpl).inSingletonScope();
});
