import EventEmitter from "node:events";
import path from "node:path";
import { Worker } from "node:worker_threads";

import { inject, injectable } from "inversify";

import { AppConfigurationTree } from "$node-base/configuration";
import { NodeWorkerMessageTransport } from "$node-base/ipc";
import { makeServiceIdentifier, WorkerData } from "$node-base/utils";
import { MessageTransport } from "$pure-base/ipc";

interface WorkerShim
  extends EventEmitter<{
    started: [transport: MessageTransport];
  }> {
  start(): Promise<void>;
}
const WorkerShim = makeServiceIdentifier<WorkerShim>("worker shim");
export { WorkerShim };

@injectable()
export class NodeWorkerShim
  extends EventEmitter<{
    started: [transport: MessageTransport];
  }>
  implements WorkerShim
{
  private current: NodeWorkerMessageTransport | null = null;

  constructor(
    @inject(AppConfigurationTree) private readonly config: AppConfigurationTree,
  ) {
    super();
  }

  start(): Promise<void> {
    if (this.current) {
      throw new Error("Worker already started");
    }

    return new Promise<void>((resolve) => {
      const worker = new Worker(path.join(import.meta.dirname, "worker.mjs"), {
        name: "background-task",
        argv: [],
        stderr: false,
        stdin: false,
        stdout: false,
        workerData: {
          config: this.config,
        } satisfies WorkerData,
      });
      const transport = (this.current = new NodeWorkerMessageTransport(
        "worker",
        worker,
      ));
      worker.once("online", () => {
        if (this.current === transport) {
          this.emit("started", transport);
          resolve();
        }
      });
    });
  }
}
