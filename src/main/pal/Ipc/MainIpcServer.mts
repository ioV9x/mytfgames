import { ipcMain } from "electron/main";
import { inject, injectable, multiInject } from "inversify";

import { registerIpcServices, type RemoteProcedureServer } from "$ipc/core";

import { IpcServiceProvider } from "./IpcServiceProvider.mjs";
import { ElectronMainMessageTransport } from "./MainMessageTransport.mjs";

export const RemoteProcedureServerInjectionSymbol = Symbol(
  "remote procedure server",
);

@injectable()
export class MainIpcServer {
  constructor(
    @inject(RemoteProcedureServerInjectionSymbol)
    private readonly remoteProcedureServer: RemoteProcedureServer,
    @multiInject(IpcServiceProvider)
    private readonly ipcServiceProviders: Record<string, unknown>[],
  ) {
    for (const ipcServiceProvider of this.ipcServiceProviders) {
      registerIpcServices(this.remoteProcedureServer, ipcServiceProvider);
    }

    ipcMain.on("register", (ev) => {
      const port = ev.ports[0]!;
      this.remoteProcedureServer.addTransport(
        new ElectronMainMessageTransport(
          `webcontents-${ev.sender.id.toString()}`,
          port,
        ),
      );
      port.start();
    });
  }
}
