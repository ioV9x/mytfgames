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
  rid?: string | undefined;
  /**
   * Name of the game.
   */
  name: string;
  /**
   * Last update date of the game in ISO 8601 format.
   */
  lastUpdate: string;
}

export const GameInfoService = makeRemoteServiceDescriptor("games:info", {
  getGames: makeRemoteProcedureDescriptor<[], GameInfo[]>(),
});
