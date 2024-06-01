import {
  makeRemoteProcedureDescriptor,
  makeRemoteServiceDescriptor,
} from "$ipc/core";

export interface GameInfo {
  /**
   * Internal UUID of the game.
   */
  id: string;
  /**
   * remote id of the game used by tfgames.site
   */
  tfgamesId?: number | undefined;
  /**
   * Name of the game.
   */
  name: string;
  /**
   * Last update date of the game in ISO 8601 format.
   */
  lastUpdate: string;
}

export enum GameOrderType {
  Name = "name",
  LastUpdate = "lastUpdate",
}

export interface GameList {
  order: string[];
  preloaded: GameInfo[];
}

export const GameInfoService = makeRemoteServiceDescriptor("games:info", {
  getGames: makeRemoteProcedureDescriptor<[ids: string[]], GameInfo[]>(),
  getGameList: makeRemoteProcedureDescriptor<
    [order: GameOrderType, page: number, pageSize: number, force: boolean],
    GameList
  >(),
});
