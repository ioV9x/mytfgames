import type { GameId } from "./GameEntities.mjs";

export type AuthorId = Buffer;

export interface AuthorTable {
  /**
   * UUID of the author.
   */
  author_id: AuthorId;
  /**
   * The imported information version.
   */
  metadata_timestamp: number;
  /**
   * The display name of the author.
   */
  name: string;
  /**
   * The profile ID of the author assigned by TFGames.
   */
  tfgames_site_profile_id: number | null;
}

export interface GameAuthorTable {
  /**
   * UUID of the game; foreign key to the game table.
   */
  game_id: GameId;
  /**
   * UUID of the author; foreign key to the author table.
   */
  author_id: AuthorId;
}
