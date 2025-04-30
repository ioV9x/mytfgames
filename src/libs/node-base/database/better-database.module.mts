import { SqliteDialect } from "kysely";

import { BindFn } from "$node-base/utils";

import { DatabaseDialectFactory } from "./AppDatabase.mjs";

export function bindBetterSqliteDialect(bind: BindFn) {
  const betterSqlite3 = import("better-sqlite3");

  bind(DatabaseDialectFactory).toConstantValue(
    (dbPath, fileMustExist = true) =>
      new SqliteDialect({
        async database() {
          const { default: SQLiteDatabase } = await betterSqlite3;
          const instance = new SQLiteDatabase(dbPath, {
            // migrations will create the database if it doesn't exist
            // if you access the database before the migrations are run,
            // you'll rightfully get an error
            fileMustExist,
            timeout: 10000,
          });
          return instance;
        },
      }),
  );
}
