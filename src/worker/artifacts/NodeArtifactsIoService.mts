import { injectable } from "inversify";

import { ArtifactIoServiceDescriptor } from "$ipc/worker-main";
import { remoteProcedure } from "$pure-base/ipc";

@injectable()
export class NodeArtifactIoService {
  @remoteProcedure(ArtifactIoServiceDescriptor, "importFolder")
  importFolder() {
    /* TBA */
  }
}
