export interface TagCategoryTable {
  /**
   * The id of the tag category.
   */
  tag_category: string;
  /**
   * The descriptive name of the tag category.
   */
  description: string;
}
/**
 * Well known tag categories, these need to be kept in sync with db migrations.
 */
export enum WellKnownTagCategory {
  Adult = "AT",
  Multimedia = "MM",
  Transformation = "TF",
}

export interface TagTable {
  /**
   * The tag category of the tag.
   */
  tag_category: string;
  /**
   * The id of the tag.
   */
  tag: string;
  /**
   * The name of the tag.
   */
  tag_name: string;
}

/**
 * Extends a tag definition with a link to an official TFGames tag.
 */
export interface OfficialTagTable {
  tag_category: string;
  tag: string;
  /**
   * The id of the tag as assigned by TFGames.
   */
  tfgames_tag_id: number;
}

/**
 * Associative table between games and tags.
 */
export interface GameTagTable {
  tag_category: string;
  tag: string;
  game_id: Buffer;
}
