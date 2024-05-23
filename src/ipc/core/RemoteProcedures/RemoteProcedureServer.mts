import { IpcMessageEvent, MessageTransport } from "../Messages/index.mjs";
import { RemoteProcedureOptions } from "./RemoteProcedureDescriptor.mjs";

interface ProcedureInfo extends RemoteProcedureOptions {
  procedure: (...args: unknown[]) => unknown;
}

export class RemoteProcedureServer {
  private readonly procedures = Object.create(null) as Record<
    string,
    ProcedureInfo | undefined
  >;
  private readonly transports = new Set<MessageTransport>();

  addTransport(transport: MessageTransport): void {
    if (this.transports.has(transport)) {
      return;
    }
    this.transports.add(transport);
    transport.addEventListener(
      "ipc-closed",
      () => void this.transports.delete(transport),
    );
    transport.addEventListener("ipc-message", this.onMessage.bind(this));
  }

  registerProcedure(
    serviceId: string,
    procId: string,
    options: RemoteProcedureOptions,
    procedure: (...args: unknown[]) => unknown,
  ) {
    const compoundId = this.makeId(serviceId, procId);
    if (this.procedures[compoundId] != null) {
      throw new Error("procedure already registered");
    }
    this.procedures[compoundId] = Object.assign(
      Object.create(null) as object,
      options,
      {
        procedure,
      },
    );
  }

  private onMessage(ev: IpcMessageEvent): void {
    if (ev.data[0] !== "rpc:call") {
      return;
    }
    this.callProcedure(ev.target, ...ev.data);
  }

  private callProcedure(
    target: MessageTransport,
    _: "rpc:call",
    serviceId: string,
    procId: string,
    txn: number,
    args: unknown[],
  ): void {
    const procedureInfo = this.procedures[this.makeId(serviceId, procId)];
    if (!procedureInfo) {
      target.postMessage([
        "rpc:result",
        txn,
        undefined,
        new Error("no such procedure"),
      ]);
      return;
    }
    const procedure = procedureInfo.procedure;
    try {
      const result = procedure(...args);
      if (
        result != null &&
        typeof result === "object" &&
        result instanceof Promise
      ) {
        result.then(
          this.postResult.bind(this, target, txn),
          this.postError.bind(this, target, txn),
        );
      } else {
        this.postResult(target, txn, result);
      }
    } catch (error) {
      this.postError(target, txn, error);
    }
  }

  private postError(
    target: MessageTransport,
    txn: number,
    error: unknown,
  ): void {
    target.postMessage(["rpc:result", txn, undefined, error]);
  }
  private postResult(
    target: MessageTransport,
    txn: number,
    result: unknown,
  ): void {
    target.postMessage(["rpc:result", txn, result]);
  }

  private makeId(serviceId: string, procId: string): string {
    return `${serviceId}.${procId}`;
  }
}
