import type { IpcMessage } from "./Messages.mjs";

export interface IpcMessageEvent {
  readonly type: "ipc-message";
  readonly data: IpcMessage;
  readonly target: MessageTransport;
}
export interface IpcClosedEvent {
  readonly type: "ipc-closed";
  readonly target: MessageTransport;
}

export type IpcEventArgs =
  | [type: "ipc-message", listener: (ev: IpcMessageEvent) => void]
  | [type: "ipc-closed", listener: (ev: IpcClosedEvent) => void];

export interface IpcEventMap {
  "ipc-message": IpcMessageEvent;
  "ipc-closed": IpcClosedEvent;
}

export interface MessageTransport {
  readonly id: string;

  start(): void;
  close(): void;

  addEventListener(...args: IpcEventArgs): void;

  postMessage(message: IpcMessage, transfer?: unknown[] | undefined): void;
}
