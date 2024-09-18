import {
  makeRemoteProcedureDescriptor,
  makeRemoteServiceDescriptor,
} from "$pure-base/ipc";

import { GameSId } from "./GameDataService.mjs";

export const ArtifactService = makeRemoteServiceDescriptor("artifacts", {
  importArtifact: makeRemoteProcedureDescriptor<[gameId: GameSId], void>(),
});
