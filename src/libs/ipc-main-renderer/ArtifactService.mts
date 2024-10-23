import {
  makeRemoteProcedureDescriptor,
  makeRemoteServiceDescriptor,
} from "$pure-base/ipc";

import type { GameSId } from "./GameDataService.mjs";

export const ArtifactService = makeRemoteServiceDescriptor("artifacts", {
  startImportFromFilesystem: makeRemoteProcedureDescriptor<
    [gameId: GameSId, version: string, platform: string, path: string],
    void
  >(),

  openDirectoryChooser: makeRemoteProcedureDescriptor<[], string | null>(),
});
