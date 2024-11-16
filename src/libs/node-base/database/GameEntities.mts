import { Generated } from "kysely";

export type GameId = Buffer;
export type TfgamesGameId = number;

export interface GameTable {
  /**
   * Internal UUID of the game.
   */
  game_id: GameId;
}

export interface GameUserNotesTable {
  /**
   * UUID of the game; foreign key to the game table.
   */
  game_id: GameId;
  /**
   * The title of the game assigned by the current user.
   */
  custom_name: string;
  last_change_datetime: string;
  last_played_datetime: Generated<string>;
  /**
   * The numerical rating of the game assigned by the current user. [0, 10]
   *
   * The default value of -1 indicates that the user has not rated the game.
   */
  user_rating: Generated<number>;
  /**
   * The user supplied note about the game.
   *
   * Default value is an empty string.
   */
  note: Generated<string>;
}

/**
 * Information about the game scraped from TFGames' game index page.
 */
export interface GameOfficialListingTable {
  /**
   * UUID of the game; foreign key to the game table.
   */
  game_id: GameId;
  /**
   * Id of the game listing assigned by TFGames.
   */
  tfgames_game_id: TfgamesGameId;
  /**
   * Official name as set by the author on TFGames.
   */
  name: string;
  /**
   * The number of likes the game has on TFGames.
   */
  num_likes: number;
  /**
   * Last update datetime of the game on TFGames in ISO 8601 format.
   *
   * The time value defaults to 00:00:00 if we weren't logged in during the last
   * scrape.
   */
  last_update_datetime: string;
}

/**
 * Games which still appear on the official listing but have their details
 * blacklisted.
 */
export interface GameOfficialBlacklistTable {
  /**
   * UUID of the game; foreign key to the official listing table.
   */
  game_id: GameId;
  /**
   * The datetime the game was found to be blacklisted in ISO 8601 format.
   */
  last_crawl_datetime: string;
}

/**
 * Information about the game scraped from TFGames' individual game page
 * (not including tags, author and version information).
 *
 * If we change the schema of any crawled information, we need to reset the
 * `last_crawl_datetime` to "1970-01-01T00:00:00Z" for all games in order to
 * force a re-crawl.
 */
export interface GameOfficialListingDetailsTable {
  /**
   * UUID of the game; foreign key to the official listing table.
   */
  game_id: GameId;
  /**
   * The datetime the game was last crawled in ISO 8601 format.
   */
  last_crawl_datetime: string;
  /**
   * The datetime the game was released in ISO 8601 format.
   *
   * The time value defaults to 00:00:00 if we weren't logged in during the last
   * scrape.
   */
  release_datetime: string;
  /**
   * The synopsis of the game as a html token soup.
   */
  synopsis: string;
}

export interface GameOfficialListingOutdatedView {
  game_id: GameId;
  tfgames_game_id: number;
  name: string;
  last_update_datetime: string;
  last_crawl_datetime: string;
}
