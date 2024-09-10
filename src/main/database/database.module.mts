import SQLite from "better-sqlite3";
import { ContainerModule } from "inversify";
import { Kysely, SqliteDialect } from "kysely";

import { AppConfigurationTree } from "$main/configuration";
import { AppDatabase, DatabaseProvider } from "$node-libs/database";

export const DatabaseModule = new ContainerModule((bind) => {
  bind(DatabaseProvider)
    .toDynamicValue((context) => {
      const dbPath = context.container.get(AppConfigurationTree).paths.database;
      const dialect = new SqliteDialect({
        database() {
          const instance = new SQLite(dbPath, {
            // migrations will create the database if it doesn't exist
            // if you access the database before the migrations are run,
            // you'll rightfully get an error
            fileMustExist: true,
          });
          return Promise.resolve(instance);
        },
      });

      return new Kysely<AppDatabase>({
        dialect,
        log: ["error"],
      });
    })
    .inSingletonScope();
});
