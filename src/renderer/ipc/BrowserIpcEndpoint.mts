import { Store } from "redux";

import {
  IpcEndpoint,
  RemoteProcedureCallDispatcher,
  RemoteReduxActionReceiver,
} from "$pure-base/ipc";

import { BrowserMessageTransport } from "./BrowserMessageTransport.mts";

export class BrowserIpcEndpoint implements IpcEndpoint {
  private readonly transport: BrowserMessageTransport;
  readonly dispatcher: RemoteProcedureCallDispatcher;
  readonly actionReceiver: RemoteReduxActionReceiver;

  constructor(port: MessagePort, store: Store) {
    this.transport = new BrowserMessageTransport("main-process", port);
    this.dispatcher = new RemoteProcedureCallDispatcher(this.transport);
    this.actionReceiver = new RemoteReduxActionReceiver(store, this.transport);
    this.transport.start();
  }
}
