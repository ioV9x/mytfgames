import { makeRemoteServiceCollectionDescriptor } from "$pure-base/ipc";

import { ArtifactIoServiceDescriptor } from "./Artifacts.mjs";
export { ArtifactIoService } from "./Artifacts.mjs";

export { ArtifactIoServiceDescriptor };

export default makeRemoteServiceCollectionDescriptor({
  artifactIo: ArtifactIoServiceDescriptor,
});
