import type { Kysely } from "kysely";

import { makeServiceIdentifier } from "$main/utils";

import { GameTable } from "./GameTable.mjs";

export interface AppDatabase {
  game: GameTable;
}

type DatabaseProvider = Kysely<AppDatabase>;
const DatabaseProvider =
  makeServiceIdentifier<DatabaseProvider>("kysely database");
export { DatabaseProvider };
