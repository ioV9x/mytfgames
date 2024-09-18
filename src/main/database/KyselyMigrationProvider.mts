import fs from "node:fs";
import path from "node:path";

import SQLite from "better-sqlite3";
import {
  Kysely,
  Migration,
  MigrationProvider,
  Migrator,
  SqliteDialect,
} from "kysely";

import { AppDatabase } from "$node-base/database";
import { isErrnoException } from "$node-base/utils";

export class ViteMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    // we need to await the import because it's a dynamic import which looses
    // its type information if we don't
    // eslint-disable-next-line @typescript-eslint/await-thenable, @typescript-eslint/return-await
    return await import.meta.glob("./migrations/*.mts", { eager: true });
  }
}

export async function migrate(dbPath: string): Promise<void> {
  const dbDir = path.dirname(dbPath);
  const dbName = path.basename(dbPath);
  fs.mkdirSync(dbDir, { recursive: true });

  const tmpDir = fs.mkdtempSync(path.join(dbDir, "db-migration-attempt-"));
  const tmpDbPath = path.join(tmpDir, dbName);
  try {
    fs.copyFileSync(
      dbPath,
      tmpDbPath,
      fs.constants.COPYFILE_FICLONE | fs.constants.COPYFILE_EXCL,
    );
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      // swallow the error, we create a new database file if it doesn't exist
    } else {
      throw error;
    }
  }

  const rawDatabase = new SQLite(tmpDbPath, { fileMustExist: false });
  const db = new Kysely<AppDatabase>({
    dialect: new SqliteDialect({
      database: rawDatabase,
    }),
  });

  const migrator = new Migrator({
    db,
    provider: new ViteMigrationProvider(),
  });

  // check if we need to run any migrations
  const migrations = await migrator.getMigrations();
  if (!migrations.some((migration) => migration.executedAt == null)) {
    await db.destroy();
    rawDatabase.close();
    fs.rmSync(tmpDbPath);
    fs.rmdirSync(tmpDir);
    return;
  }

  const { error } = await migrator.migrateToLatest();
  if (error != null) {
    // no cleanup, we want to keep the database file for debugging
    throw new Error("Failed to apply migrations", { cause: error });
  }

  await db.destroy();
  rawDatabase.close();

  fs.renameSync(tmpDbPath, dbPath);
  fs.rmSync(`${tmpDbPath}-journal`);
  fs.rmdirSync(tmpDir);
}
