import { createAction } from "@reduxjs/toolkit";
import * as R from "remeda";

import {
  makeRemoteProcedureDescriptor,
  makeRemoteServiceDescriptor,
} from "$pure-base/ipc";
import { SortDirection } from "$pure-base/utils";

export type GameSId = string;
export interface Game {
  id: GameSId;
  userNotes: null | {
    name: string;
    lastChangeTimestamp: string;
    lastPlayedTimestamp: string;
    userRating: number;
    note: string;
  };
  metadata: null | {
    name: string;
    synopsis: string;
    fullDescription: string;
    lastUpdateTimestamp: string;
  };
  listing: null | {
    tfgamesId: number;
    name: string;
    numLikes: number;
    lastUpdateTimestamp: string;
  };
}

export function makeGameDisplayName(game: Game): string | undefined {
  if (game.userNotes != null) {
    const officialName = game.metadata?.name ?? game.listing?.name;
    return officialName == null || officialName === game.userNotes.name
      ? game.userNotes.name
      : `${game.userNotes.name} (${officialName})`;
  }
  if (game.metadata != null) {
    return game.metadata.name;
  }
  if (game.listing != null) {
    return game.listing.name;
  }
  return undefined;
}

export interface GameList {
  order: GameSId[];
  preloaded: Game[];
}
export interface GameSearchParams {
  name?: string | undefined;
  orderType: GameOrderType;
  orderDirection: SortDirection;
  page?: {
    no: number;
    size: number;
  };
}
export interface GameSearchResult {
  selected: GameSId[];
  total: number;
}

export enum GameOrderType {
  Id = "id",
  Name = "name",
  LastUpdate = "lastUpdate",
}
const GameOrderValues = Object.freeze(
  R.unique(Object.values(GameOrderType)).sort(),
);
export function isGameOrderType(value: unknown): value is GameOrderType {
  return (
    typeof value === "string" &&
    R.sortedIndex(GameOrderValues, value) !== GameOrderValues.length
  );
}

export const gameCrawled = createAction(
  "ipc/games/crawled",
  (data: Game): { payload: Game } => {
    return { payload: data };
  },
);

export const gameIndexUpdated = createAction<{ numGames: number }>(
  "ipc/games/index-updated",
);

export const GameDataService = makeRemoteServiceDescriptor("games:data", {
  createCustomGame: makeRemoteProcedureDescriptor<
    [
      description: {
        name: string;
        userRating?: number;
        note: string;
      },
    ],
    GameSId
  >(),
  retrieveOrder: makeRemoteProcedureDescriptor<
    [],
    Record<GameOrderType, GameSId[]>
  >(),
  retrieveGamesById: makeRemoteProcedureDescriptor<[ids: GameSId[]], Game[]>(),
  findGamesByNamePrefix: makeRemoteProcedureDescriptor<
    [prefix: string],
    GameSId[]
  >(),
  updateGameDescription: makeRemoteProcedureDescriptor<
    [
      id: GameSId,
      description: {
        name: string;
        userRating: number;
        note: string;
      },
    ],
    void
  >(),
  findGames: makeRemoteProcedureDescriptor<
    [search: GameSearchParams],
    GameSearchResult
  >(),

  startGame: makeRemoteProcedureDescriptor<
    [gameSId: GameSId, version: string],
    void
  >(),
});
