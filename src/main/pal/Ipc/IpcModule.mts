import { ContainerModule } from "inversify";

import {
  DefaultRemoteReduxActionSender,
  RemoteProcedureServer,
} from "$pure-base/ipc";

import { MainIpcServer, RemoteReduxActionSender } from "./index.mjs";
import {
  MainIpcServer as MainIpcServerImpl,
  RemoteProcedureServerInjectionSymbol,
} from "./MainIpcServer.mjs";

export const PalIpcModule = new ContainerModule(({ bind }) => {
  bind<RemoteProcedureServer>(RemoteProcedureServerInjectionSymbol)
    .toResolvedValue(() => new RemoteProcedureServer())
    .inSingletonScope();
  bind(RemoteReduxActionSender)
    .toResolvedValue(() => new DefaultRemoteReduxActionSender())
    .inSingletonScope();

  bind(MainIpcServer).to(MainIpcServerImpl).inSingletonScope();
});
