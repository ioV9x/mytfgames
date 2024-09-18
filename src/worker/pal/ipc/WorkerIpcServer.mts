import { parentPort } from "node:worker_threads";

import { inject, injectable, multiInject } from "inversify";

import {
  IpcServiceProvider,
  NodeMessagePortMessageTransport,
} from "$node-base/ipc";
import { makeServiceIdentifier } from "$node-base/utils";
import {
  registerIpcServices,
  type RemoteProcedureServer,
} from "$pure-base/ipc";

export const IpcServer = makeServiceIdentifier<WorkerIpcServer>("ipc server");

export const RemoteProcedureServerInjectionSymbol = Symbol(
  "remote procedure server",
);

@injectable()
export class WorkerIpcServer {
  private readonly messageTransport = new NodeMessagePortMessageTransport(
    "parent",
    parentPort!,
  );

  constructor(
    @inject(RemoteProcedureServerInjectionSymbol)
    private readonly remoteProcedureServer: RemoteProcedureServer,
    @multiInject(IpcServiceProvider)
    private readonly ipcServiceProviders: Record<string, unknown>[],
  ) {
    for (const ipcServiceProvider of this.ipcServiceProviders) {
      registerIpcServices(this.remoteProcedureServer, ipcServiceProvider);
    }

    this.remoteProcedureServer.addTransport(this.messageTransport);
    this.messageTransport.start();
  }
}
