import { ContainerModule } from "inversify";

import DefaultWorkerRemoteServiceCollection from "$ipc/worker-main";
import { bindIpcServices } from "$node-base/ipc";

import { NodeWorkerShim, WorkerShim } from "./Worker.mjs";
import { WorkerIpcEndpoint } from "./WorkerIpcEndpoint.mjs";

export const PalWorkerModule = new ContainerModule((bind) => {
  bind(WorkerShim).to(NodeWorkerShim).inSingletonScope();
  bind(WorkerIpcEndpoint).toSelf().inSingletonScope();

  bindIpcServices(
    bind,
    WorkerIpcEndpoint,
    DefaultWorkerRemoteServiceCollection,
  );
});
