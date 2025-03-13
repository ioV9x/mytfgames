import { ContainerModule } from "inversify";

import { IpcServiceProvider } from "$node-base/ipc";

import { NodeArtifactIoService } from "./NodeArtifactsIoService.mjs";

export const ArtifactsModule = new ContainerModule(({ bind }) => {
  bind(NodeArtifactIoService).toSelf().inSingletonScope();
  bind(IpcServiceProvider).toService(NodeArtifactIoService);
});
