import { makeServiceIdentifier } from "$node-base/utils";
import {
  makeRemoteProcedureDescriptor,
  makeRemoteServiceDescriptor,
  RemoteServiceId,
} from "$pure-base/ipc";

export const ArtifactIoServiceDescriptor = makeRemoteServiceDescriptor(
  "worker:artifacts",
  {
    importFolder: makeRemoteProcedureDescriptor<
      [rootNode: bigint, folderPath: string],
      void
    >(),
  },
);

type ArtifactIoService = typeof ArtifactIoServiceDescriptor;
const ArtifactIoService = makeServiceIdentifier<
  typeof ArtifactIoServiceDescriptor
>(ArtifactIoServiceDescriptor[RemoteServiceId]);
export { ArtifactIoService };
