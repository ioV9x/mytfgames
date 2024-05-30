import { Generated, Insertable, Selectable, Updateable } from "kysely";

export interface GameTable {
  rowid: Generated<number>;

  /**
   * Internal UUID of the game.
   */
  id: string;
  /**
   * remote id of the game used by tfgames.site
   */
  tfgames_id: string | null;
  /**
   * Name of the game.
   */
  name: string;
  /**
   * Last update date of the game in ISO 8601 format.
   */
  last_update: string | null;
}
export type Game = Selectable<GameTable>;
export type NewGame = Insertable<GameTable>;
export type GameUpdate = Updateable<GameTable>;
