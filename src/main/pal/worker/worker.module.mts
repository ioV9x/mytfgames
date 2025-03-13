import { ContainerModule } from "inversify";

import DefaultWorkerRemoteServiceCollection from "$ipc/worker-main";
import { bindIpcServices } from "$node-base/ipc";

import { NodeWorkerShim, WorkerShim } from "./Worker.mjs";
import { WorkerIpcEndpoint } from "./WorkerIpcEndpoint.mjs";

export const PalWorkerModule = new ContainerModule((options) => {
  options.bind(WorkerShim).to(NodeWorkerShim).inSingletonScope();
  options.bind(WorkerIpcEndpoint).toSelf().inSingletonScope();

  bindIpcServices(
    options,
    WorkerIpcEndpoint,
    DefaultWorkerRemoteServiceCollection,
  );
});
