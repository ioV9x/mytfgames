import { IpcEndpoint, RemoteProcedureCallDispatcher } from "$ipc/core";

import { BrowserMessageTransport } from "./BrowserMessageTransport.mts";

export class BrowserIpcEndpoint implements IpcEndpoint {
  private readonly transport: BrowserMessageTransport;
  readonly dispatcher: RemoteProcedureCallDispatcher;

  constructor(port: MessagePort) {
    this.transport = new BrowserMessageTransport("main-process", port);
    this.dispatcher = new RemoteProcedureCallDispatcher(this.transport);
    this.transport.start();
  }
}
