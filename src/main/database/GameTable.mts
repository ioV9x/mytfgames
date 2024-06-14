import { Generated, Insertable, Selectable, Updateable } from "kysely";

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
  /**
   * Creation date of the local db entry in ISO 8601 format.
   */
  created_at: string;
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
  /**
   * Creation date as per TFGames.site in ISO 8601 format.
   */
  release_date: string | null;
}

export interface RemoteAuthorTable {
  /**
   * remote id of the author used by tfgames.site
   */
  id: number;
  /**
   * Name of the author.
   */
  name: string;
}

/**
 * Associative table between games and authors.
 */
export interface RemoteGameAuthorTable {
  game_id: number;
  author_id: number;
}

export interface RemoteGameVersionTable {
  game_id: number;
  version: string;
  url: string;
  name: string;
  note: string;
}

export enum CategoryType {
  Transformation,
  Adult,
  Multimedia,
  MaturityRating,
}
export interface RemoteCategoryTable {
  /**
   * local id of the category.
   */
  id: Generated<number>;
  /**
   * remote id of the category used by tfgames.site.
   */
  rid: number;
  /**
   * Type of the category.
   */
  type: CategoryType;
  /**
   * Name of the category.
   */
  name: string;
  /**
   * Abbreviation of the category.
   */
  abbreviation: string;
}

/**
 * Associative table between games and categories.
 */
export interface RemoteGameCategoryTable {
  game_id: number;
  category_id: number;
}
