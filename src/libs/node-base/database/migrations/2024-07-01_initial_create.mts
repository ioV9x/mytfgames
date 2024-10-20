import { Kysely, sql } from "kysely";

import { sqliteSafeMigration } from "$node-base/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await sql`PRAGMA journal_mode = TRUNCATE`.execute(db);
  await sqliteSafeMigration(db, async (trx) => {
    ////////////////////////////////////////////////////////////////////////////
    // tags
    //
    await trx.schema
      .createTable("tag_category")
      .addColumn("tag_category", "text", (col) => col.notNull().primaryKey())
      .addColumn("description", "text", (col) => col.notNull())
      .modifyEnd(sql`WITHOUT ROWID, STRICT`)
      .execute();
    await trx
      .insertInto("tag_category")
      .values(
        [
          ["AT", "adult themes"],
          ["MM", "multimedia themes"],
          ["TF", "transformation themes"],
        ].map(([tag_category, description]) => ({
          tag_category,
          description,
        })),
      )
      .execute();

    await trx.schema
      .createTable("tag")
      .addColumn("tag_category", "text", (col) => col.notNull())
      .addColumn("tag", "text", (col) => col.notNull())
      .addColumn("tag_name", "text", (col) => col.notNull())
      .addPrimaryKeyConstraint("tag_pk", ["tag_category", "tag"])
      .addForeignKeyConstraint(
        "tag_category_classifies_tag_fk",
        ["tag_category"],
        "tag_category",
        ["tag_category"],
        (cb) => cb.onUpdate("cascade").onDelete("cascade"),
      )
      .addUniqueConstraint("u__tag_category__tag_name", [
        "tag_category",
        "tag_name",
      ])
      .modifyEnd(sql`STRICT`)
      .execute();

    await trx.schema
      .createTable("official_tag")
      .addColumn("tag_category", "text", (col) => col.notNull())
      .addColumn("tag", "text", (col) => col.notNull())
      .addColumn("tfgames_tag_id", "integer", (col) => col.notNull().unique())
      .addPrimaryKeyConstraint("official_tag_pk", ["tag_category", "tag"])
      .addForeignKeyConstraint(
        "tag_refers_to_official_tag_fk",
        ["tag_category", "tag"],
        "tag",
        ["tag_category", "tag"],
        (cb) => cb.onUpdate("cascade").onDelete("cascade"),
      )
      .modifyEnd(sql`STRICT`)
      .execute();

    ////////////////////////////////////////////////////////////////////////////
    // filesystem
    //
    await trx.schema
      .createTable("node_type")
      .addColumn("node_type", "text", (col) => col.notNull().primaryKey())
      .addColumn("name", "text", (col) => col.notNull())
      .modifyEnd(sql`WITHOUT ROWID, STRICT`)
      .execute();
    await trx
      .insertInto("node_type")
      .values([
        {
          node_type: "D",
          name: "Directory",
        },
        {
          node_type: "F",
          name: "File",
        },
      ])
      .execute();

    await trx.schema
      .createTable("node")
      .addColumn("node_no", "integer", (col) => col.notNull().primaryKey())
      .addColumn("node_type", "text", (col) => col.notNull())
      .addForeignKeyConstraint(
        "node_type_discriminates_node_fk",
        ["node_type"],
        "node_type",
        ["node_type"],
      )
      .modifyEnd(sql`STRICT`)
      .execute();

    await trx.schema
      .createTable("node_directory")
      .addColumn("directory_no", "integer", (col) => col.notNull().primaryKey())
      .addForeignKeyConstraint(
        "node_is_node_directory_fk",
        ["directory_no"],
        "node",
        ["node_no"],
        (cb) => cb.onDelete("cascade"),
      )
      .modifyEnd(sql`STRICT`)
      .execute();

    await trx.schema
      .createTable("node_member")
      .addColumn("node_no", "integer", (col) => col.notNull().primaryKey())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("node_no_parent", "integer", (col) => col.notNull())
      .addForeignKeyConstraint(
        "node_is_node_member_fk",
        ["node_no"],
        "node",
        ["node_no"],
        (cb) => cb.onDelete("cascade"),
      )
      .addForeignKeyConstraint(
        "node_directory_contains_node_member_fk",
        ["node_no_parent"],
        "node_directory",
        ["directory_no"],
      )
      .addUniqueConstraint("u__node_no_parent__name", [
        "node_no_parent",
        "name",
      ])
      .modifyEnd(sql`STRICT`)
      .execute();

    await trx.schema
      .createTable("node_file_content")
      .addColumn("blake3_hash", "blob", (col) => col.notNull().primaryKey())
      .addColumn("size", "integer", (col) => col.notNull())
      .addColumn("data", "blob")
      .modifyEnd(sql`STRICT`)
      .execute();

    await trx.schema
      .createTable("node_file")
      .addColumn("file_no", "integer", (col) => col.notNull().primaryKey())
      .addColumn("unix_mode", "integer", (col) => col.notNull())
      .addColumn("blake3_hash", "blob", (col) => col.notNull())
      .addForeignKeyConstraint(
        "node_is_node_file_fk",
        ["file_no"],
        "node",
        ["node_no"],
        (cb) => cb.onDelete("cascade"),
      )
      .addForeignKeyConstraint(
        "node_file_content_deduplicates_node_file_fk",
        ["blake3_hash"],
        "node_file_content",
        ["blake3_hash"],
      )
      .modifyEnd(sql`STRICT`)
      .execute();
    await trx.schema
      .createIndex("node_file_____blake3_hash")
      .on("node_file")
      .column("blake3_hash")
      .execute();

    // create well known directories
    // 0 is the root node
    // -1 is reserved as an invalid node number / sentinel value
    // [-128; -2] are reserved for well known root directories
    // [-2**63; -129] are reserved for well known directories
    await trx
      .insertInto("node")
      .values([
        { node_no: 0n, node_type: "D" },
        { node_no: -2n, node_type: "D" },
        { node_no: -3n, node_type: "D" },
        { node_no: -129n, node_type: "D" },
      ])
      .execute();
    await trx
      .insertInto("node_directory")
      .values([
        { directory_no: 0n },
        { directory_no: -2n },
        { directory_no: -3n },
        { directory_no: -129n },
      ])
      .execute();
    await trx
      .insertInto("node_member")
      .values([
        { node_no: -2n, name: "tmp", node_no_parent: 0n },
        { node_no: -3n, name: "artifacts", node_no_parent: 0n },
        { node_no: -129n, name: "import", node_no_parent: -2n },
      ])
      .execute();

    ////////////////////////////////////////////////////////////////////////////
    // games
    //
    await trx.schema
      .createTable("game")
      .addColumn("game_id", "blob", (col) => col.notNull().primaryKey())
      .modifyEnd(sql`WITHOUT ROWID, STRICT`)
      .execute();

    await trx.schema
      .createTable("game_description")
      .addColumn("game_id", "blob", (col) => col.notNull().primaryKey())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("last_change_datetime", "text", (col) => col.notNull())
      .addColumn("last_played_datetime", "text", (col) =>
        col.notNull().defaultTo(""),
      )
      .addColumn("user_rating", "integer", (col) => col.notNull().defaultTo(-1))
      .addColumn("note", "text", (col) => col.notNull().defaultTo(""))
      .addForeignKeyConstraint(
        "game_refined_by_game_description_fk",
        ["game_id"],
        "game",
        ["game_id"],
        (cb) => cb.onDelete("cascade"),
      )
      .modifyEnd(sql`STRICT`)
      .execute();
    await trx.schema
      .createIndex("game_description_____name")
      .on("game_description")
      .column("name")
      .execute();
    await trx.schema
      .createIndex("game_description_____last_change_datetime")
      .on("game_description")
      .column("last_change_datetime")
      .execute();
    await trx.schema
      .createIndex("game_description_____last_played_datetime")
      .on("game_description")
      .column("last_played_datetime")
      .execute();

    await trx.schema
      .createTable("game_tag")
      .addColumn("tag_category", "text", (col) => col.notNull())
      .addColumn("tag", "text", (col) => col.notNull())
      .addColumn("game_id", "blob", (col) => col.notNull())
      .addPrimaryKeyConstraint("game_tag_pk", [
        "tag_category",
        "tag",
        "game_id",
      ])
      .addForeignKeyConstraint(
        "game_categorized_by_game_tag_fk",
        ["game_id"],
        "game",
        ["game_id"],
        (cb) => cb.onDelete("cascade"),
      )
      .modifyEnd(sql`STRICT`)
      .execute();
    await trx.schema
      .createIndex("game_tag_____game_id")
      .on("game_tag")
      .column("game_id")
      .execute();

    await trx.schema
      .createTable("game_official_listing")
      .addColumn("game_id", "blob", (col) => col.notNull().primaryKey())
      .addColumn("tfgames_game_id", "integer", (col) => col.notNull().unique())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("num_likes", "integer", (col) => col.notNull())
      .addColumn("last_update_datetime", "text", (col) => col.notNull())
      .addForeignKeyConstraint(
        "game_refined_by_game_official_listing_fk",
        ["game_id"],
        "game",
        ["game_id"],
        (cb) => cb.onDelete("cascade"),
      )
      .modifyEnd(sql`STRICT`)
      .execute();
    await trx.schema
      .createIndex("game_official_listing_____name")
      .on("game_official_listing")
      .column("name")
      .execute();
    await trx.schema
      .createIndex("game_official_listing_____num_likes")
      .on("game_official_listing")
      .column("num_likes")
      .execute();
    await trx.schema
      .createIndex("game_official_listing_____last_update_datetime")
      .on("game_official_listing")
      .column("last_update_datetime")
      .execute();

    await trx.schema
      .createTable("game_official_blacklist")
      .addColumn("game_id", "blob", (col) => col.notNull().primaryKey())
      .addColumn("last_crawl_datetime", "text", (col) => col.notNull())
      .addForeignKeyConstraint(
        "game_official_listing_blacklisted_by_game_official_blacklist_fk",
        ["game_id"],
        "game_official_listing",
        ["game_id"],
        (cb) => cb.onDelete("cascade"),
      )
      .modifyEnd(sql`STRICT`)
      .execute();

    await trx.schema
      .createTable("game_official_listing_details")
      .addColumn("game_id", "blob", (col) => col.notNull().primaryKey())
      .addColumn("last_crawl_datetime", "text", (col) => col.notNull())
      .addColumn("release_datetime", "text", (col) => col.notNull())
      .addColumn("synopsis", "text", (col) => col.notNull())
      .addForeignKeyConstraint(
        "game_official_listing_refined_by_game_official_listing_details_fk",
        ["game_id"],
        "game_official_listing",
        ["game_id"],
        (cb) => cb.onDelete("cascade"),
      )
      .modifyEnd(sql`STRICT`)
      .execute();

    await trx.schema
      .createTable("tfgames_author")
      .addColumn("tfgames_profile_id", "integer", (col) =>
        col.notNull().primaryKey(),
      )
      .addColumn("username", "text", (col) => col.notNull().unique())
      .modifyEnd(sql`STRICT`)
      .execute();

    await trx.schema
      .createTable("game_official_tfgames_author")
      .addColumn("game_id", "blob", (col) => col.notNull())
      .addColumn("tfgames_profile_id", "integer", (col) => col.notNull())
      .addPrimaryKeyConstraint("game_official_tfgames_author_pk", [
        "game_id",
        "tfgames_profile_id",
      ])
      .addForeignKeyConstraint(
        "game_official_listing_created_by_tfgames_author_fk",
        ["game_id"],
        "game",
        ["game_id"],
        (cb) => cb.onDelete("cascade"),
      )
      .addForeignKeyConstraint(
        "tfgames_author_creates_game_official_listing_fk",
        ["tfgames_profile_id"],
        "tfgames_author",
        ["tfgames_profile_id"],
        (cb) => cb.onDelete("cascade"),
      )
      .modifyEnd(sql`STRICT`)
      .execute();
    await trx.schema
      .createIndex("game_official_tfgames_author_____tfgames_profile_id")
      .on("game_official_tfgames_author")
      .column("tfgames_profile_id")
      .execute();

    await trx.schema
      .createTable("game_version")
      .addColumn("game_id", "blob", (col) => col.notNull())
      .addColumn("version", "text", (col) => col.notNull())
      .addColumn("note", "text", (col) => col.notNull().defaultTo(""))
      .addPrimaryKeyConstraint("game_version_pk", ["game_id", "version"])
      .addForeignKeyConstraint(
        "game_consists_of_game_version_fk",
        ["game_id"],
        "game",
        ["game_id"],
        (cb) => cb.onDelete("cascade"),
      )
      .modifyEnd(sql`STRICT`)
      .execute();

    await trx.schema
      .createTable("game_version_source")
      .addColumn("game_id", "blob", (col) => col.notNull())
      .addColumn("version", "text", (col) => col.notNull())
      .addColumn("uri", "text", (col) => col.notNull())
      .addColumn("official_note", "text", (col) => col.notNull())
      .addPrimaryKeyConstraint("game_version_source_pk", [
        "game_id",
        "version",
        "uri",
      ])
      .addForeignKeyConstraint(
        "game_version_available_through_game_version_source_fk",
        ["game_id", "version"],
        "game_version",
        ["game_id", "version"],
        (cb) => cb.onDelete("cascade"),
      )
      .modifyEnd(sql`STRICT`)
      .execute();

    await trx.schema
      .createTable("artifact_platform")
      .addColumn("platform_type", "text", (col) => col.notNull().primaryKey())
      .addColumn("name", "text", (col) => col.notNull().unique())
      .addColumn("user_defined", "integer", (col) => col.notNull().defaultTo(1))
      .modifyEnd(sql`WITHOUT ROWID, STRICT`)
      .execute();
    await trx
      .insertInto("artifact_platform")
      .values(
        [
          ["la64", "Linux ARM64", 0],
          ["lx64", "Linux x64", 0],
          ["lx86", "Linux x86", 0],
          ["ma64", "macOS ARM64", 0],
          ["mx64", "macOS x64", 0],
          ["N/A", "N/A: cross-platform", 0],
          ["twin", "TWINE html", 0],
          ["wa64", "Windows ARM64", 0],
          ["wx64", "Windows x64", 0],
          ["wx86", "Windows x86", 0],
        ].map(([platform_type, name, user_defined]) => ({
          platform_type,
          name,
          user_defined,
        })),
      )
      .execute();

    await trx.schema
      .createTable("game_version_artifact")
      .addColumn("game_id", "blob", (col) => col.notNull())
      .addColumn("version", "text", (col) => col.notNull())
      .addColumn("platform_type", "text", (col) => col.notNull())
      .addColumn("node_no", "integer", (col) => col.notNull().unique())
      .addPrimaryKeyConstraint("game_version_artifact_pk", [
        "game_id",
        "version",
        "platform_type",
      ])
      .addForeignKeyConstraint(
        "game_version_consists_of_game_version_artifact_fk",
        ["game_id", "version"],
        "game_version",
        ["game_id", "version"],
        // no cascading delete; the artifact fs entry needs manual cleanup
        // i.e. deleting a game with existing artifacts is a logic error
      )
      .addForeignKeyConstraint(
        "artifact_platform_differentiates_game_version_artifact_fk",
        ["platform_type"],
        "artifact_platform",
        ["platform_type"],
      )
      .modifyEnd(sql`STRICT`)
      .execute();

    //////////////////////////////////////////////////////////////////////////////
    // db views
    //
    await trx.schema
      .createView("game_official_listing_outdated_v")
      .columns([
        "game_id",
        "tfgames_game_id",
        "name",
        "last_update_datetime",
        "last_crawl_datetime",
      ])
      .as(
        trx
          .selectFrom("game_official_listing as listing")
          .select([
            "listing.game_id",
            "listing.tfgames_game_id",
            "listing.name",
            "listing.last_update_datetime as last_update_datetime",
            "details.last_crawl_datetime as last_crawl_datetime",
          ])
          .leftJoin(
            "game_official_listing_details as details",
            "details.game_id",
            "listing.game_id",
          )
          .leftJoin(
            "game_official_blacklist as blacklist",
            "blacklist.game_id",
            "listing.game_id",
          )
          .where((eb) =>
            eb.or([
              eb("details.last_crawl_datetime", "is", null),
              sql`unixepoch(details.last_crawl_datetime) < (unixepoch(listing.last_update_datetime) - 86400)`,
            ]),
          )
          .where((eb) =>
            eb.or([
              eb("blacklist.last_crawl_datetime", "is", null),
              eb(
                "blacklist.last_crawl_datetime",
                "<",
                eb.ref("listing.last_update_datetime"),
              ),
            ]),
          )
          .orderBy("details.last_crawl_datetime asc")
          .orderBy("last_update_datetime desc"),
      )
      .execute();
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await sqliteSafeMigration(db, async (trx) => {
    //////////////////////////////////////////////////////////////////////////////
    // db views
    //
    await trx.schema.dropView("game_official_listing_outdated_v").execute();

    ////////////////////////////////////////////////////////////////////////////
    // games
    //
    await trx.schema.dropTable("game_version_artifact").execute();
    await trx.schema.dropTable("artifact_platform").execute();
    await trx.schema.dropTable("game_version_source").execute();
    await trx.schema.dropTable("game_version").execute();
    await trx.schema
      .dropIndex("game_official_tfgames_author_____tfgames_profile_id")
      .on("game_official_tfgames_author")
      .execute();
    await trx.schema.dropTable("game_official_tfgames_author").execute();
    await trx.schema.dropTable("tfgames_author").execute();
    await trx.schema.dropTable("game_official_listing_details").execute();
    await trx.schema
      .dropIndex("game_official_listing_____last_update_datetime")
      .on("game_official_listing")
      .execute();
    await trx.schema
      .dropIndex("game_official_listing_____num_likes")
      .on("game_official_listing")
      .execute();
    await trx.schema
      .dropIndex("game_official_listing_____name")
      .on("game_official_listing")
      .execute();
    await trx.schema.dropTable("game_official_blacklist").execute();
    await trx.schema.dropTable("game_official_listing").execute();
    await trx.schema.dropIndex("game_tag_____game_id").on("game_tag").execute();
    await trx.schema.dropTable("game_tag").execute();
    await trx.schema
      .dropIndex("game_description_____last_played_datetime")
      .on("game_description")
      .execute();
    await trx.schema
      .dropIndex("game_description_____last_update_datetime")
      .on("game_description")
      .execute();
    await trx.schema
      .dropIndex("game_description_____name")
      .on("game_description")
      .execute();
    await trx.schema.dropTable("game_description").execute();
    await trx.schema.dropTable("game").execute();

    ////////////////////////////////////////////////////////////////////////////
    // filesystem
    //
    await trx.schema
      .dropIndex("node_file_____blake3_hash")
      .on("node_file")
      .execute();
    await trx.schema.dropTable("node_file").execute();
    await trx.schema.dropTable("node_file_content").execute();
    await trx.schema.dropTable("node_member").execute();
    await trx.schema.dropTable("node_directory").execute();
    await trx.schema.dropTable("node").execute();
    await trx.schema.dropTable("node_type").execute();

    ////////////////////////////////////////////////////////////////////////////
    // tags
    //
    await trx.schema.dropTable("official_tag").execute();
    await trx.schema.dropTable("tag").execute();
    await trx.schema.dropTable("tag_category").execute();
  });
}
