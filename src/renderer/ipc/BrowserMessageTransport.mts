import { IpcEventArgs, IpcMessage, MessageTransport } from "$pure-base/ipc";

export class BrowserMessageTransport implements MessageTransport {
  constructor(
    readonly id: string,
    private readonly port: MessagePort,
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
      this.port.addEventListener("message", (ev) =>
        typedListener({
          type: "ipc-message",
          data: ev.data as unknown as IpcMessage,
          target: this,
        }),
      );
    }
    // Browser MessagePort doesn't support a closed event
  }
  postMessage(message: IpcMessage, transfer: unknown[]): void {
    this.port.postMessage(message, transfer as Transferable[]);
  }
}
