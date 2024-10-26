import { ContainerModule } from "inversify";

import { JobSource } from "$main/pal";
import { IpcServiceProvider } from "$node-base/ipc";

import { ArtifactOperationService } from "./ArtifactOperationService.mjs";
import { ArtifactsOperationSchedule } from "./ArtifactsOperationSchedule.mjs";
import { DefaultArtifactOperationService } from "./DefaultArtifactOperationService.mjs";

export const ArtifactsModule = new ContainerModule((bind) => {
  bind(ArtifactOperationService)
    .to(DefaultArtifactOperationService)
    .inTransientScope();

  bind(ArtifactsOperationSchedule).toSelf().inSingletonScope();
  bind(JobSource).toService(ArtifactsOperationSchedule);
  bind(IpcServiceProvider).toService(ArtifactsOperationSchedule);
});
