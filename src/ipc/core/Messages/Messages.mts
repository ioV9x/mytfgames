export type IpcMessage =
  | RemoteProcedureCallMessage
  | RemoteProcedureResultMessage;

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
