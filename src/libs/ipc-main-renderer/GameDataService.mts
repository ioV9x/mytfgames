import { createAction } from "@reduxjs/toolkit";
import * as R from "remeda";

import {
  makeRemoteProcedureDescriptor,
  makeRemoteServiceDescriptor,
} from "$pure-base/ipc";

export type GameSId = string;
export interface Game {
  id: GameSId;
  description: null | {
    name: string;
    lastChangeTimestamp: string;
    lastPlayedTimestamp: string;
    userRating: number;
    note: string;
  };
  listing: null | {
    tfgamesId: number;
    name: string;
    numLikes: number;
    lastUpdateTimestamp: string;
  };
}

export function makeGameDisplayName(game: Game): string | undefined {
  if (game.description?.name == null) {
    return game.listing?.name;
  } else if (game.listing?.name == null) {
    return game.description.name;
  } else if (game.description.name === game.listing.name) {
    return game.description.name;
  } else {
    return `${game.description.name} (${game.listing.name})`;
  }
}

export interface GameList {
  order: GameSId[];
  preloaded: Game[];
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

export const gameIndexUpdated = createAction<Record<GameOrderType, GameSId[]>>(
  "ipc/games/index-updated",
);

export const GameDataService = makeRemoteServiceDescriptor("games:data", {
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
});
