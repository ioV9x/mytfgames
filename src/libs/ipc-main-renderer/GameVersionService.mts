import {
  makeRemoteProcedureDescriptor,
  makeRemoteServiceDescriptor,
} from "$pure-base/ipc";

import { GameSId } from "./GameDataService.mjs";

export interface GameVersion {
  gameId: GameSId;
  version: string;
  note: string;

  artifacts: GameArtifact[];
  sources: GameVersionSource[];
}

export interface GameArtifact {
  platform: string;
}

export interface GameVersionSource {
  uri: string;
  officialNote: string;
}

export interface ArtifactPlatform {
  id: string;
  name: string;
  userDefined: boolean;
}

export const GameVersionService = makeRemoteServiceDescriptor(
  "games:versions",
  {
    getArtifactPlatforms: makeRemoteProcedureDescriptor<
      [],
      ArtifactPlatform[]
    >(),

    retrieveVersionsForGame: makeRemoteProcedureDescriptor<
      [gameId: GameSId],
      GameVersion[]
    >(),
  },
);
