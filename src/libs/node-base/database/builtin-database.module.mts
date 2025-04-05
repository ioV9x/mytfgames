import { DatabaseSync } from "node:sqlite";

import { ContainerModule } from "inversify";
import { Kysely } from "kysely";

import { AppConfigurationTree } from "$node-base/configuration";
import { AppDatabase, DatabaseProvider } from "$node-base/database";

import { NodeSqliteDialect } from "./kysely-support/NodeSqliteDialect.mjs";

export const DatabaseModule = new ContainerModule(({ bind }) => {
  bind(DatabaseProvider)
    .toResolvedValue(
      (configTree) => {
        const dbPath = configTree.paths.database;
        const dialect = new NodeSqliteDialect({
          database() {
            const instance = new DatabaseSync(dbPath, {
              open: true,
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
