import SQLite from "better-sqlite3";
import { ContainerModule } from "inversify";
import { Kysely, SqliteDialect } from "kysely";

import { AppConfigurationTree } from "$node-base/configuration";
import { AppDatabase, DatabaseProvider } from "$node-base/database";

export const DatabaseModule = new ContainerModule(({ bind }) => {
  bind(DatabaseProvider)
    .toResolvedValue(
      (configTree: AppConfigurationTree) => {
        const dbPath = configTree.paths.database;
        const dialect = new SqliteDialect({
          database() {
            const instance = new SQLite(dbPath, {
              // migrations will create the database if it doesn't exist
              // if you access the database before the migrations are run,
              // you'll rightfully get an error
              fileMustExist: true,
              timeout: 10000,
            });
            return Promise.resolve(instance);
          },
        });

        return new Kysely<AppDatabase>({
          dialect,
          log: ["error"],
        });
      },
      [AppConfigurationTree],
    )
    .inSingletonScope();
});
