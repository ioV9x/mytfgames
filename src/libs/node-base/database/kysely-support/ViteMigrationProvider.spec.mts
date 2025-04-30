import { DatabaseSync } from "node:sqlite";

import { Kysely, Migrator } from "kysely";
import { describe, expect, it } from "vitest";

import { AppDatabase } from "$node-base/database";

import { NodeSqliteDialect } from "./NodeSqliteDialect.mjs";
import { ViteMigrationProvider } from "./ViteMigrationProvider.mjs";

describe("ViteDatabaseProvider", () => {
  it("should migrate the database", async () => {
    const database = new DatabaseSync(":memory:");
    const db = new Kysely<AppDatabase>({
      dialect: new NodeSqliteDialect({ database }),
    });
    const migrator = new Migrator({
      db,
      provider: new ViteMigrationProvider(),
    });

    const migration = await migrator.migrateToLatest();

    expect(migration.error).toBeUndefined();
    expect(migration.results?.length).toBeGreaterThan(0);
    for (const result of migration.results!) {
      expect(result).toMatchObject({
        migrationName: expect.any(String) as string,
        direction: "Up",
        status: "Success",
      });
    }
  });
});
