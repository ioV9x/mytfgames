import { MessageTransport } from "../Messages/index.mjs";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type UnknownPayloadAction = {
  type: string;
  payload: unknown;
  meta?: unknown;
  error?: unknown;
};
export interface RemoteReduxActionSender {
  dispatch(action: UnknownPayloadAction): void;
  dispatchTo(target: MessageTransport, action: UnknownPayloadAction): void;
}

export class DefaultRemoteReduxActionSender implements RemoteReduxActionSender {
  #targets = new Set<MessageTransport>();

  addTransport(transport: MessageTransport): void {
    this.#targets.add(transport);
    transport.addEventListener(
      "ipc-closed",
      () => void this.#targets.delete(transport),
    );
  }

  dispatch(action: UnknownPayloadAction): void {
    for (const target of this.#targets) {
      this.dispatchToTarget(target, action);
    }
  }
  dispatchTo(target: MessageTransport, action: UnknownPayloadAction): void {
    if (!this.#targets.has(target)) {
      throw new Error("Target not registered");
    }
    this.dispatchToTarget(target, action);
  }

  private dispatchToTarget(
    target: MessageTransport,
    action: UnknownPayloadAction,
  ): void {
    target.postMessage(["rra:action", action]);
  }
}
