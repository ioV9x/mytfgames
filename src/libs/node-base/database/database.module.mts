import { ContainerModule } from "inversify";
import { Kysely } from "kysely";

import { AppConfigurationTree } from "$node-base/configuration";

import {
  AppDatabase,
  DatabaseDialectFactory,
  DatabaseProvider,
} from "./AppDatabase.mjs";

export { bindBetterSqliteDialect } from "./better-database.module.mjs";
export { bindBuiltinSqliteDialect } from "./builtin-database.module.mjs";

export const DatabaseModule = new ContainerModule(({ bind }) => {
  bind(DatabaseProvider)
    .toResolvedValue(
      (configTree, dialectFactory) => {
        const dbPath = configTree.paths.database;
        const dialect = dialectFactory(dbPath);

        return new Kysely<AppDatabase>({
          dialect,
          log: ["error"],
        });
      },
      [AppConfigurationTree, DatabaseDialectFactory],
    )
    .inSingletonScope();
});
