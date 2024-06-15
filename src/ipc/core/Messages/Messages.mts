import type { PayloadAction } from "@reduxjs/toolkit";

export type IpcMessage =
  | RemoteProcedureCallMessage
  | RemoteProcedureResultMessage
  | RemoteReduxStoreRegistrationMessage
  | RemoteReduxActionMessage;

////////////////////////////////////////////////////////////////////////
// RPC messages
export type RemoteProcedureCallMessage = readonly [
  "rpc:call",
  serviceId: string,
  procId: string,
  txn: number,
  args: unknown[],
];

export type RemoteProcedureResultMessage =
  | readonly ["rpc:result", txn: number, value: unknown]
  | readonly ["rpc:result", txn: number, value: undefined, error: unknown];

export function isRemoteProcedureCallMessage(
  msg: IpcMessage,
): msg is RemoteProcedureCallMessage {
  return msg[0] === "rpc:call";
}

export function isRemoteProcedureResultMessage(
  msg: IpcMessage,
): msg is RemoteProcedureResultMessage {
  return msg[0] === "rpc:result";
}

////////////////////////////////////////////////////////////////////////
// Remote redux actions
export type RemoteReduxStoreRegistrationMessage = readonly ["rra:register"];

export type RemoteReduxActionMessage = readonly [
  "rra:action",
  payload: PayloadAction<unknown>,
];

export function isRemoteReduxStoreRegistrationMessage(
  msg: IpcMessage,
): msg is RemoteReduxStoreRegistrationMessage {
  return msg[0] === "rra:register";
}

export function isRemoteReduxActionMessage(
  msg: IpcMessage,
): msg is RemoteReduxActionMessage {
  return msg[0] === "rra:action";
}
