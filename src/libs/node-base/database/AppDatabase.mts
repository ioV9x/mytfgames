import type { Dialect, Kysely, QueryCreator } from "kysely";

import { makeServiceIdentifier } from "$node-base/utils";

import type { AuthorTable, GameAuthorTable } from "./AuthorEntities.mjs";
import type {
  NodeDirectoryTable,
  NodeFileContentTable,
  NodeFileTable,
  NodeMemberTable,
  NodeTable,
  NodeTypeTable,
} from "./FilesystemEntities.mjs";
import type {
  GameMetadataTable,
  GameOfficialBlacklistTable,
  GameOfficialListingDetailsTable,
  GameOfficialListingOutdatedView,
  GameOfficialListingTable,
  GameTable,
  GameUserNotesTable,
} from "./GameEntities.mjs";
import type {
  ArtifactPlatformTable,
  GameVersionArtifactTable,
  GameVersionSourceTable,
  GameVersionTable,
} from "./GameVersionEntities.mjs";
import type {
  GameTagTable,
  OfficialTagTable,
  TagCategoryTable,
  TagTable,
} from "./TagEntities.mjs";

export interface AppDatabase {
  game: GameTable;
  game_user_notes: GameUserNotesTable;
  game_author: GameAuthorTable;
  game_metadata: GameMetadataTable;
  game_tag: GameTagTable;
  game_official_listing: GameOfficialListingTable;
  game_official_blacklist: GameOfficialBlacklistTable;
  game_official_listing_details: GameOfficialListingDetailsTable;
  game_official_listing_outdated_v: GameOfficialListingOutdatedView;
  game_version: GameVersionTable;
  game_version_artifact: GameVersionArtifactTable;
  game_version_source: GameVersionSourceTable;

  tag_category: TagCategoryTable;
  tag: TagTable;
  official_tag: OfficialTagTable;

  author: AuthorTable;

  artifact_platform: ArtifactPlatformTable;

  node_type: NodeTypeTable;
  node: NodeTable;
  node_directory: NodeDirectoryTable;
  node_member: NodeMemberTable;
  node_file: NodeFileTable;
  node_file_content: NodeFileContentTable;
}

export type AppQueryCreator = QueryCreator<AppDatabase>;

type DatabaseProvider = Kysely<AppDatabase>;
const DatabaseProvider =
  makeServiceIdentifier<DatabaseProvider>("kysely database");
export { DatabaseProvider };

type DatabaseDialectFactory = (
  dbPath: string,
  requireExisting?: boolean,
) => Dialect;
const DatabaseDialectFactory = makeServiceIdentifier<DatabaseDialectFactory>(
  "database dialect factory",
);
export { DatabaseDialectFactory };
