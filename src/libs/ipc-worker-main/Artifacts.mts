import { makeServiceIdentifier } from "$node-base/utils";
import {
  makeRemoteProcedureDescriptor,
  makeRemoteServiceDescriptor,
  RemoteServiceId,
} from "$pure-base/ipc";

export const ArtifactIoServiceDescriptor = makeRemoteServiceDescriptor(
  "worker:artifacts",
  {
    exportAsFolder: makeRemoteProcedureDescriptor<
      [rootNode: bigint, folderPath: string],
      void
    >(),
    importFromFsNode: makeRemoteProcedureDescriptor<
      [fsPath: string, targetNode: bigint],
      void
    >(),
  },
);

type ArtifactIoService = typeof ArtifactIoServiceDescriptor;
const ArtifactIoService = makeServiceIdentifier<
  typeof ArtifactIoServiceDescriptor
>(ArtifactIoServiceDescriptor[RemoteServiceId]);
export { ArtifactIoService };
