import {
  makeRemoteProcedureDescriptor,
  makeRemoteServiceDescriptor,
} from "$ipc/core";

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
  rootNodeNo: number;
}

export interface GameVersionSource {
  uri: string;
  officialNote: string;
}

export const GameVersionService = makeRemoteServiceDescriptor(
  "games:versions",
  {
    retrieveVersionsForGame: makeRemoteProcedureDescriptor<
      [gameId: GameSId],
      GameVersion[]
    >(),
  },
);
