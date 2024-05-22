import { MessagePortMain } from "electron/main";

import { IpcEventArgs, IpcMessage, MessageTransport } from "$ipc/core";

export class ElectronMainMessageTransport implements MessageTransport {
  constructor(
    readonly id: string,
    private readonly port: MessagePortMain,
  ) {}

  start(): void {
    this.port.start();
  }
  close(): void {
    this.port.close();
  }
  addEventListener(...[type, listener]: IpcEventArgs): void {
    if (type === "ipc-message") {
      const typedListener = listener;
      this.port.addListener("message", (ev) =>
        typedListener({
          type: "ipc-message",
          data: ev.data as unknown as IpcMessage,
          target: this,
        }),
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    else if (type === "ipc-closed") {
      const typedListener = listener;
      this.port.addListener("close", () =>
        typedListener({
          type: "ipc-closed",
          target: this,
        }),
      );
    } else {
      throw new Error(`Unknown event type: ${type as unknown as string}`);
    }
  }
  postMessage(message: IpcMessage, transfer: unknown[] = []): void {
    this.port.postMessage(message, transfer as MessagePortMain[]);
  }
}
