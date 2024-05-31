import type { Kysely } from "kysely";

import { makeServiceIdentifier } from "$main/utils";

import { GameTable, RemoteGameTable } from "./GameTable.mjs";

export interface AppDatabase {
  game: GameTable;
  remote_game: RemoteGameTable;
}

type DatabaseProvider = Kysely<AppDatabase>;
const DatabaseProvider =
  makeServiceIdentifier<DatabaseProvider>("kysely database");
export { DatabaseProvider };
