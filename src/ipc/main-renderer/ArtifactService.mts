import {
  makeRemoteProcedureDescriptor,
  makeRemoteServiceDescriptor,
} from "$ipc/core";

import { GameSId } from "./GameDataService.mjs";

export const ArtifactService = makeRemoteServiceDescriptor("artifacts", {
  importArtifact: makeRemoteProcedureDescriptor<[gameId: GameSId], void>(),
});
