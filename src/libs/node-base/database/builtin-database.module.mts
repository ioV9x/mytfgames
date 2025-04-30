import { BindFn } from "$node-base/utils";

import { DatabaseDialectFactory } from "./AppDatabase.mjs";
import { NodeSqliteDialect } from "./kysely-support/NodeSqliteDialect.mjs";

export function bindBuiltinSqliteDialect(bind: BindFn) {
  const nodeSqlite = import("node:sqlite");

  bind(DatabaseDialectFactory).toConstantValue(
    (dbPath) =>
      new NodeSqliteDialect({
        async database(): Promise<import("node:sqlite").DatabaseSync> {
          const { DatabaseSync } = await nodeSqlite;
          const instance = new DatabaseSync(dbPath, {
            open: true,
          });
          return instance;
        },
      }),
  );
}
