import { Generated } from "kysely";

export interface GameVersionTable {
  /**
   * UUID of the game; foreign key to the game table.
   */
  game_id: Buffer;
  /**
   * Version of the game, can be user-supplied or scraped from tfgames.
   */
  version: string;
  /**
   * A user supplied note about the version.
   */
  note: Generated<string>;
}

export interface ArtifactPlatformTable {
  /**
   * A unique identifier for the platform.
   *
   * @example "wx64", "lx64", "lx86", "ma64", "N/A", "twin"
   */
  platform_type: string;
  /**
   * The readable name of the platform.
   */
  name: string;
  /**
   * Specifies whether this is a user defined platform, i.e. whether the user
   * is allowed to delete them.
   *
   * SQLite does not have a boolean type, so we use an integer instead:
   * 0 -> false
   * 1 -> true
   */
  user_defined: Generated<number>;
}

export interface GameVersionArtifactTable {
  /**
   * UUID of the game; foreign key to the game version table.
   */
  game_id: Buffer;
  /**
   * Version of the game; foreign key to the game version table.
   */
  version: string;
  /**
   * Platform identifier; foreign key to the artifact platform table.
   */
  platform_type: string;
  /**
   * The filesystem node id of the artifact; foreign key to the node table.
   *
   * An artifact can either be a directory or a file.
   */
  node_no: bigint;
}

export interface GameVersionSourceTable {
  /**
   * UUID of the game; foreign key to the game version table.
   */
  game_id: Buffer;
  /**
   * Version of the game; foreign key to the game version table.
   */
  version: string;
  /**
   * The URI of the artifact.
   */
  uri: string;
  /**
   * A
   */
  official_note: string;
}
