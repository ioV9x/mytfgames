import { inject, injectable } from "inversify";

import {
  IpcEndpoint,
  RemoteProcedureCallDispatcher,
  RemoteReduxActionReceiver,
} from "$pure-base/ipc";

import { WorkerShim } from "./Worker.mjs";

@injectable()
export class WorkerIpcEndpoint implements IpcEndpoint {
  #dispatcher: RemoteProcedureCallDispatcher | null = null;

  constructor(@inject(WorkerShim) private readonly workerShim: WorkerShim) {
    workerShim.addListener("started", (transport) => {
      this.#dispatcher = new RemoteProcedureCallDispatcher(transport);
    });
  }

  get dispatcher(): RemoteProcedureCallDispatcher {
    if (this.#dispatcher === null) {
      throw new Error("dispatcher is not initialized");
    }
    return this.#dispatcher;
  }
  get actionReceiver(): RemoteReduxActionReceiver {
    throw new Error("Property not implemented.");
  }
}
