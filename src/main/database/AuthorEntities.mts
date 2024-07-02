export interface TfgamesAuthorTable {
  /**
   * The profile ID of the author assigned by TFGames.
   */
  tfgames_profile_id: number;
  /**
   * The profile username of the author assigned by TFGames.
   */
  username: string;
}

/**
 * Associative table between games official listings and authors.
 */
export interface GameOfficialTfgamesAuthor {
  game_id: Buffer;
  tfgames_profile_id: number;
}
