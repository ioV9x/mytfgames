import type { Kysely } from "kysely";

import { makeServiceIdentifier } from "$main/utils";

import {
  GameTable,
  RemoteAuthorTable,
  RemoteCategoryTable,
  RemoteGameAuthorTable,
  RemoteGameCategoryTable,
  RemoteGameTable,
  RemoteGameVersionTable,
} from "./GameTable.mjs";

export interface AppDatabase {
  game: GameTable;
  remote_game: RemoteGameTable;
  remote_author: RemoteAuthorTable;
  remote_game_author: RemoteGameAuthorTable;
  remote_game_version: RemoteGameVersionTable;
  remote_category: RemoteCategoryTable;
  remote_game_category: RemoteGameCategoryTable;
}

type DatabaseProvider = Kysely<AppDatabase>;
const DatabaseProvider =
  makeServiceIdentifier<DatabaseProvider>("kysely database");
export { DatabaseProvider };
