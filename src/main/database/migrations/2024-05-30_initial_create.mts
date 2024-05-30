import { Kysely, sql } from "kysely";

import { sqliteSafeMigration } from "$main/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await sql`PRAGMA journal_mode = TRUNCATE`.execute(db);
  await sqliteSafeMigration(db, async (trx) => {
    await trx.schema
      .createTable("game")
      .addColumn("rowid", "integer", (col) => col.primaryKey().autoIncrement())
      .addColumn("id", "text", (col) => col.notNull().unique())
      .addColumn("tfgames_id", "text", (col) => col.unique())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("last_update", "text")
      .execute();

    await trx.schema
      .createIndex("game_id_index")
      .on("game")
      .column("id")
      .execute();
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await sqliteSafeMigration(db, async (trx) => {
    await trx.schema.dropTable("games").execute();
  });
}
