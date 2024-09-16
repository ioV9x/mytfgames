import SQLite from "better-sqlite3";
import { Kysely, Migrator, SqliteDialect } from "kysely";
import { describe, expect, it } from "vitest";

import { AppDatabase } from "$node-base/database";

import { ViteMigrationProvider } from "./KyselyDatabaseProvider.mjs";

let canRun: boolean;
try {
  new SQLite(":memory:");
  canRun = true;
} catch {
  canRun = false;
}

describe.runIf(canRun)("KyselyDatabaseProvider", () => {
  it("should migrate the database", async () => {
    const database = new SQLite(":memory:");
    const db = new Kysely<AppDatabase>({
      dialect: new SqliteDialect({ database }),
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
