import fs from "node:fs";
import path from "node:path";

import SQLite from "better-sqlite3";
import { Kysely, Migrator, SqliteDialect } from "kysely";

import { AppDatabase, ViteMigrationProvider } from "$node-base/database";
import { isErrnoException } from "$node-base/utils";

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
  try {
    fs.copyFileSync(
      `${dbPath}-wal`,
      `${tmpDbPath}-wal`,
      fs.constants.COPYFILE_FICLONE | fs.constants.COPYFILE_EXCL,
    );
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      // swallow the error, the WAL file only exists after an app crash
    } else {
      throw error;
    }
  }

  const rawDatabase = new SQLite(tmpDbPath, { fileMustExist: false });
  rawDatabase.pragma("journal_mode = WAL");
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
  try {
    fs.rmSync(`${dbPath}-wal`);
  } catch (error) {
    if (!isErrnoException(error) || error.code !== "ENOENT") {
      throw error;
    }
  }
  fs.rmdirSync(tmpDir);
}
