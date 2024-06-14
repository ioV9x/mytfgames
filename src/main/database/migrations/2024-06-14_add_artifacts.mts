import { Kysely } from "kysely";

import { sqliteSafeMigration } from "$main/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await sqliteSafeMigration(db, async (trx) => {
    await trx.schema
      .alterTable("remote_game")
      .addColumn("release_date", "text")
      .execute();

    await trx.schema
      .createTable("remote_author")
      .addColumn("id", "integer", (col) => col.primaryKey())
      .addColumn("name", "text")
      .execute();

    await trx.schema
      .createTable("remote_game_author")
      .addColumn("game_id", "integer", (col) => col.notNull())
      .addColumn("author_id", "integer", (col) => col.notNull())
      .addPrimaryKeyConstraint("remote_game_author_pk", [
        "game_id",
        "author_id",
      ])
      .addForeignKeyConstraint(
        "remote_game_author_game_fk",
        ["game_id"],
        "remote_game",
        ["id"],
      )
      .addForeignKeyConstraint(
        "remote_game_author_author_fk",
        ["author_id"],
        "remote_author",
        ["id"],
      )
      .execute();

    await trx.schema
      .createTable("remote_game_version")
      .addColumn("game_id", "integer", (col) => col.notNull())
      .addForeignKeyConstraint(
        "remote_game_version_game_fk",
        ["game_id"],
        "remote_game",
        ["id"],
      )
      .addColumn("version", "text", (col) => col.notNull())
      .addColumn("url", "text", (col) => col.notNull())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("note", "text", (col) => col.notNull())
      .execute();
    await trx.schema
      .createIndex("remote_game_version_game_id_version_url_index")
      .on("remote_game_version")
      .columns(["game_id", "version", "url"])
      .unique()
      .execute();

    await trx.schema
      .createTable("remote_category")
      .addColumn("id", "integer", (col) => col.primaryKey())
      .addColumn("rid", "integer", (col) => col.notNull())
      .addColumn("type", "integer", (col) => col.notNull())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("abbreviation", "text", (col) => col.notNull())
      .execute();
    await trx.schema
      .createIndex("remote_category_type_rid_index")
      .on("remote_category")
      .columns(["type", "rid"])
      .unique()
      .execute();
    await trx.schema
      .createIndex("remote_category_name_index")
      .on("remote_category")
      .column("name")
      .execute();

    await trx.schema
      .createTable("remote_game_category")
      .addColumn("game_id", "integer", (col) => col.notNull())
      .addColumn("category_id", "integer", (col) => col.notNull())
      .addPrimaryKeyConstraint("remote_game_category_pk", [
        "game_id",
        "category_id",
      ])
      .addForeignKeyConstraint(
        "remote_game_category_game_fk",
        ["game_id"],
        "remote_game",
        ["id"],
      )
      .addForeignKeyConstraint(
        "remote_game_category_category_fk",
        ["category_id"],
        "remote_category",
        ["id"],
      )
      .execute();
    await trx.schema
      .createIndex("remote_game_category_category_id_index")
      .on("remote_game_category")
      .column("category_id")
      .execute();
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await sqliteSafeMigration(db, async (trx) => {
    await trx.schema
      .dropIndex("remote_game_category_category_id_index")
      .on("remote_game_category")
      .execute();
    await trx.schema.dropTable("remote_game_category").execute();

    await trx.schema
      .dropIndex("remote_category_type_rid_index")
      .on("remote_category")
      .execute();
    await trx.schema
      .dropIndex("remote_category_name_index")
      .on("remote_category")
      .execute();
    await trx.schema.dropTable("remote_category").execute();

    await trx.schema
      .dropIndex("remote_game_version_game_id_version_url_index")
      .on("remote_game_version")
      .execute();
    await trx.schema.dropTable("remote_game_version").execute();

    await trx.schema.dropTable("remote_game_author").execute();

    await trx.schema.dropTable("remote_author").execute();

    await trx.schema
      .alterTable("remote_game")
      .dropColumn("release_date")
      .execute();
  });
}
