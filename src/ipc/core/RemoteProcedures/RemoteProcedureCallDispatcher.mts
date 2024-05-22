import { IpcMessageEvent, type MessageTransport } from "../Messages/index.mjs";
import { IdGenerator } from "../Utils/index.mjs";

interface CallInfo {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: unknown) => void;
}

export class TransportClosedError extends Error {}

export class RemoteProcedureCallDispatcher {
  private readonly executingCalls = new Map<number, CallInfo>();

  constructor(
    private readonly transport: MessageTransport,
    private readonly txnGenerator = IdGenerator(),
  ) {
    transport.addEventListener("ipc-closed", () => {
      for (const { reject } of this.executingCalls.values()) {
        reject(
          new TransportClosedError(
            `RPC did not complete before "${this.transport.id}" closed`,
          ),
        );
      }
    });
    transport.addEventListener("ipc-message", ({ data }: IpcMessageEvent) => {
      console.log(data);
      if (data[0] !== "rpc:result") {
        return;
      }
      const info = this.executingCalls.get(data[1]);
      if (info == null) {
        return;
      }
      if (data.length === 3) {
        info.resolve(data[2]);
      } else {
        info.reject(data[3]);
      }
    });
  }

  dispatch(
    serviceId: string,
    procId: string,
    args: unknown[],
  ): Promise<unknown> {
    const txn = this.txnGenerator.next().value;
    this.transport.postMessage(["rpc:call", serviceId, procId, txn, args]);

    return new Promise<unknown>((resolve, reject) => {
      this.executingCalls.set(txn, { resolve, reject });
    });
  }
}
