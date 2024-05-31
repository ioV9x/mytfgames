import { Insertable, Selectable, Updateable } from "kysely";

export interface GameTable {
  /**
   * Internal UUID of the game.
   */
  id: Buffer;
  /**
   * Remote id of the game used by tfgames.site; foreign key to remote game table.
   */
  tfgames_id: number | null;
  /**
   * Name of the game given by the user.
   */
  name: string | null;
}
export type Game = Selectable<GameTable>;
export type NewGame = Insertable<GameTable>;
export type GameUpdate = Updateable<GameTable>;

export interface RemoteGameTable {
  /**
   * remote id of the game used by tfgames.site
   */
  id: number;
  /**
   * Official name as set by the author on TFGames.site.
   */
  name: string;
  /**
   * Last update date of the game in ISO 8601 format.
   */
  last_update: string;
}
