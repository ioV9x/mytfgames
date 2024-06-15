import type { Store } from "redux";

import {
  IpcMessageEvent,
  isRemoteReduxActionMessage,
  MessageTransport,
} from "../Messages/index.mjs";

export class RemoteReduxActionReceiver {
  #store: Store;
  #source: MessageTransport;

  constructor(store: Store, source: MessageTransport) {
    this.#store = store;
    this.#source = source;

    this.#source.addEventListener("ipc-message", this.onMessage.bind(this));
  }

  private onMessage(ev: IpcMessageEvent): void {
    if (isRemoteReduxActionMessage(ev.data)) {
      this.#store.dispatch(ev.data[1]);
    }
  }
}
