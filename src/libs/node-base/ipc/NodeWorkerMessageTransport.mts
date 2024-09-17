import { TransferListItem, Worker } from "node:worker_threads";

import { IpcEventArgs, IpcMessage, MessageTransport } from "$pure-base/ipc";

export class NodeWorkerMessageTransport implements MessageTransport {
  constructor(
    readonly id: string,
    private readonly port: Worker,
  ) {}

  start(): void {
    /* the worker is already started */
  }
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  close(): Promise<number> {
    return this.port.terminate();
  }
  addEventListener(...[type, listener]: IpcEventArgs): void {
    if (type === "ipc-message") {
      const typedListener = listener;
      this.port.addListener("message", (data) =>
        typedListener({
          type: "ipc-message",
          data: data as IpcMessage,
          target: this,
        }),
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    else if (type === "ipc-closed") {
      const typedListener = listener;
      this.port.addListener("exit", () =>
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
    this.port.postMessage(message, transfer as TransferListItem[]);
  }
}
