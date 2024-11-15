import { ipcMain } from "electron/main";
import { inject, injectable, multiInject } from "inversify";

import { IpcServiceProvider, RemoteReduxActionSender } from "$node-base/ipc";
import {
  DefaultRemoteReduxActionSender,
  registerIpcServices,
  type RemoteProcedureServer,
} from "$pure-base/ipc";

import { ElectronMainMessageTransport } from "./MainMessageTransport.mjs";

export const RemoteProcedureServerInjectionSymbol = Symbol(
  "remote procedure server",
);

@injectable()
export class MainIpcServer {
  constructor(
    @inject(RemoteProcedureServerInjectionSymbol)
    private readonly remoteProcedureServer: RemoteProcedureServer,
    @inject(RemoteReduxActionSender)
    private readonly remoteReduxActionSender: DefaultRemoteReduxActionSender,
    @multiInject(IpcServiceProvider)
    private readonly ipcServiceProviders: Record<string, unknown>[],
  ) {
    for (const ipcServiceProvider of this.ipcServiceProviders) {
      registerIpcServices(this.remoteProcedureServer, ipcServiceProvider);
    }

    ipcMain.on("register", (ev) => {
      const port = ev.ports[0];
      if (port == null) {
        // TODO: log error
        return;
      }
      const transport = new ElectronMainMessageTransport(
        `webcontents-${ev.sender.id.toString()}`,
        ev.sender.id,
        port,
      );
      this.remoteProcedureServer.addTransport(transport);
      this.remoteReduxActionSender.addTransport(transport);
      port.start();
    });
  }
}
