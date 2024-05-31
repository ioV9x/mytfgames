import { Kysely, sql } from "kysely";

import { sqliteSafeMigration } from "$main/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await sql`PRAGMA journal_mode = TRUNCATE`.execute(db);
  await sqliteSafeMigration(db, async (trx) => {
    await trx.schema
      .createTable("game")
      .addColumn("id", "blob", (col) => col.primaryKey())
      .addColumn("tfgames_id", "integer", (col) => col.unique())
      .addForeignKeyConstraint(
        "tfgames_id_foreign",
        ["tfgames_id"],
        "remote_game",
        ["id"],
      )
      .addColumn("name", "text")
      .execute();

    await trx.schema
      .createTable("remote_game")
      .addColumn("id", "integer", (col) => col.primaryKey())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("last_update", "text", (col) => col.notNull())
      .execute();

    await trx.schema
      .createIndex("game_id_index")
      .on("game")
      .column("id")
      .unique()
      .execute();
    await trx.schema
      .createIndex("game_tfgames_id_index")
      .on("game")
      .column("tfgames_id")
      .unique()
      .execute();

    await trx.schema
      .createIndex("remote_game_id_index")
      .on("remote_game")
      .column("id")
      .unique()
      .execute();
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await sqliteSafeMigration(db, async (trx) => {
    await trx.schema.dropTable("games").execute();
    await trx.schema.dropTable("remote_game").execute();
  });
}
