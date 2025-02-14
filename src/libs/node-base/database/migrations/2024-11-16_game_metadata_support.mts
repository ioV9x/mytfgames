import { Kysely, sql } from "kysely";

import { sqliteSafeMigration } from "$node-base/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await sqliteSafeMigration(db, async (trx) => {
    ////////////////////////////////////////////////////////////////////////////
    // tags
    //
    await trx
      .deleteFrom("artifact_platform")
      // Twine needs to be differentiated between Harlowe, SugarCube, …
      .where("platform_type", "=", "htwi")
      .execute();
    await trx
      .insertInto("tag")
      .values([
        { tag_category: "AT", tag: "Dom", tag_name: "Domination" },
        { tag_category: "AT", tag: "F-Self", tag_name: "Female Masturbation" },
        { tag_category: "AT", tag: "FF", tag_name: "Female/Female" },
        { tag_category: "AT", tag: "M-Self", tag_name: "Male Masturbation" },
        { tag_category: "AT", tag: "MF", tag_name: "Male/Female" },
        { tag_category: "AT", tag: "MM", tag_name: "Male/Male" },
        { tag_category: "AT", tag: "Noncon", tag_name: "Non-Consent" },
        { tag_category: "AT", tag: "Other", tag_name: "Other" },
        { tag_category: "AT", tag: "Preg", tag_name: "Pregnancy" },
        { tag_category: "AT", tag: "Sub", tag_name: "Submission" },
        { tag_category: "MM", tag: "2-D", tag_name: "2-D Graphics" },
        { tag_category: "MM", tag: "3-D", tag_name: "3-D Graphics" },
        { tag_category: "MM", tag: "AI-Art", tag_name: "AI Generated Art" },
        { tag_category: "MM", tag: "Draw", tag_name: "Drawings" },
        { tag_category: "MM", tag: "Music", tag_name: "Music" },
        { tag_category: "MM", tag: "Photo", tag_name: "Photographs" },
        { tag_category: "MM", tag: "Rend", tag_name: "3-D Renders" },
        { tag_category: "MM", tag: "SFX", tag_name: "Sound Effects" },
        { tag_category: "MM", tag: "Video", tag_name: "Video" },
        { tag_category: "MM", tag: "Voice", tag_name: "Voice" },
        { tag_category: "TF", tag: "Animal", tag_name: "Animal" },
        {
          tag_category: "TF",
          tag: "Anthro",
          tag_name: "Anthromorphic Creature",
        },
        { tag_category: "TF", tag: "AP", tag_name: "Age Progression" },
        { tag_category: "TF", tag: "AR", tag_name: "Age Regression" },
        { tag_category: "TF", tag: "BE", tag_name: "Breast Enlargement" },
        { tag_category: "TF", tag: "Bimbo", tag_name: "Bimbo" },
        { tag_category: "TF", tag: "Corr", tag_name: "Corruption" },
        {
          tag_category: "TF",
          tag: "F2M",
          tag_name: "Female to Male (Genital Changes)",
        },
        { tag_category: "TF", tag: "Fem", tag_name: "Feminization" },
        { tag_category: "TF", tag: "Grow", tag_name: "Growth/Expansion" },
        { tag_category: "TF", tag: "Herm", tag_name: "Hermaphrodite" },
        { tag_category: "TF", tag: "Invol", tag_name: "Involuntary" },
        {
          tag_category: "TF",
          tag: "M2F",
          tag_name: "Male to Female (Genital Changes)",
        },
        { tag_category: "TF", tag: "Masc", tag_name: "Masculinization" },
        { tag_category: "TF", tag: "MC", tag_name: "Mental Changes" },
        { tag_category: "TF", tag: "Myth", tag_name: "Mythical Creature" },
        { tag_category: "TF", tag: "Object", tag_name: "Object" },
        { tag_category: "TF", tag: "Other", tag_name: "Other" },
        { tag_category: "TF", tag: "Poss", tag_name: "Possession" },
        { tag_category: "TF", tag: "Robot", tag_name: "Robot" },
        { tag_category: "TF", tag: "SheM", tag_name: "Shemale" },
        { tag_category: "TF", tag: "Shrink", tag_name: "Shrinking" },
        { tag_category: "TF", tag: "Sissy", tag_name: "Sissification" },
        { tag_category: "TF", tag: "Slow", tag_name: "Slow Transformation" },
        { tag_category: "TF", tag: "Swap", tag_name: "Bodyswap" },
        { tag_category: "TF", tag: "Vol", tag_name: "Voluntary" },
      ])
      .onConflict((oc) => oc.columns(["tag_category", "tag"]).doNothing())
      .execute();

    await trx
      .insertInto("official_tag")
      .values([
        { tag_category: "AT", tag: "Dom", tfgames_tag_id: "42" },
        { tag_category: "AT", tag: "F-Self", tfgames_tag_id: "37" },
        { tag_category: "AT", tag: "FF", tfgames_tag_id: "34" },
        { tag_category: "AT", tag: "M-Self", tfgames_tag_id: "36" },
        { tag_category: "AT", tag: "MF", tfgames_tag_id: "33" },
        { tag_category: "AT", tag: "MM", tfgames_tag_id: "35" },
        { tag_category: "AT", tag: "Noncon", tfgames_tag_id: "49" },
        { tag_category: "AT", tag: "Other", tfgames_tag_id: "38" },
        { tag_category: "AT", tag: "Preg", tfgames_tag_id: "43" },
        { tag_category: "AT", tag: "Sub", tfgames_tag_id: "41" },
        { tag_category: "MM", tag: "2-D", tfgames_tag_id: "24" },
        { tag_category: "MM", tag: "3-D", tfgames_tag_id: "25" },
        { tag_category: "MM", tag: "AI-Art", tfgames_tag_id: "50" },
        { tag_category: "MM", tag: "Draw", tfgames_tag_id: "27" },
        { tag_category: "MM", tag: "Music", tfgames_tag_id: "28" },
        { tag_category: "MM", tag: "Photo", tfgames_tag_id: "29" },
        { tag_category: "MM", tag: "Rend", tfgames_tag_id: "26" },
        { tag_category: "MM", tag: "SFX", tfgames_tag_id: "30" },
        { tag_category: "MM", tag: "Video", tfgames_tag_id: "31" },
        { tag_category: "MM", tag: "Voice", tfgames_tag_id: "32" },
        { tag_category: "TF", tag: "Animal", tfgames_tag_id: "20" },
        { tag_category: "TF", tag: "Anthro", tfgames_tag_id: "21" },
        { tag_category: "TF", tag: "AP", tfgames_tag_id: "1" },
        { tag_category: "TF", tag: "AR", tfgames_tag_id: "2" },
        { tag_category: "TF", tag: "BE", tfgames_tag_id: "4" },
        { tag_category: "TF", tag: "Bimbo", tfgames_tag_id: "15" },
        { tag_category: "TF", tag: "Corr", tfgames_tag_id: "39" },
        { tag_category: "TF", tag: "F2M", tfgames_tag_id: "5" },
        { tag_category: "TF", tag: "Fem", tfgames_tag_id: "45" },
        { tag_category: "TF", tag: "Grow", tfgames_tag_id: "7" },
        { tag_category: "TF", tag: "Herm", tfgames_tag_id: "16" },
        { tag_category: "TF", tag: "Invol", tfgames_tag_id: "8" },
        { tag_category: "TF", tag: "M2F", tfgames_tag_id: "9" },
        { tag_category: "TF", tag: "Masc", tfgames_tag_id: "47" },
        { tag_category: "TF", tag: "MC", tfgames_tag_id: "10" },
        { tag_category: "TF", tag: "Myth", tfgames_tag_id: "17" },
        { tag_category: "TF", tag: "Object", tfgames_tag_id: "22" },
        { tag_category: "TF", tag: "Other", tfgames_tag_id: "11" },
        { tag_category: "TF", tag: "Poss", tfgames_tag_id: "12" },
        { tag_category: "TF", tag: "Robot", tfgames_tag_id: "18" },
        { tag_category: "TF", tag: "SheM", tfgames_tag_id: "19" },
        { tag_category: "TF", tag: "Shrink", tfgames_tag_id: "14" },
        { tag_category: "TF", tag: "Sissy", tfgames_tag_id: "44" },
        { tag_category: "TF", tag: "Slow", tfgames_tag_id: "40" },
        { tag_category: "TF", tag: "Swap", tfgames_tag_id: "3" },
        { tag_category: "TF", tag: "Vol", tfgames_tag_id: "23" },
      ])
      .onConflict((oc) => oc.columns(["tag_category", "tag"]).doNothing())
      .execute();

    ////////////////////////////////////////////////////////////////////////////
    // game_user_notes
    //
    await trx.schema.dropIndex("game_description_____name").execute();
    await trx.schema
      .dropIndex("game_description_____last_change_datetime")
      .execute();
    await trx.schema
      .dropIndex("game_description_____last_played_datetime")
      .execute();

    await trx.schema
      .alterTable("game_description")
      .renameTo("game_user_notes")
      .execute();
    await trx.schema
      .alterTable("game_user_notes")
      .renameColumn("name", "custom_name")
      .execute();

    await trx.schema
      .createIndex("game_user_notes_____custom_name")
      .on("game_user_notes")
      .column("custom_name")
      .execute();
    await trx.schema
      .createIndex("game_user_notes_____last_change_datetime")
      .on("game_user_notes")
      .column("last_change_datetime")
      .execute();
    await trx.schema
      .createIndex("game_user_notes_____last_played_datetime")
      .on("game_user_notes")
      .column("last_played_datetime")
      .execute();

    ////////////////////////////////////////////////////////////////////////////
    // game_metadata
    //
    await trx.schema
      .createTable("game_metadata")
      .addColumn("game_id", "blob", (col) => col.notNull().primaryKey())
      .addColumn("medata_timestamp", "integer", (col) => col.notNull())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("tfgames_site_game_id", "integer")
      .addColumn("synopsis", "text", (col) => col.notNull())
      .addColumn("full_description", "text", (col) => col.notNull())
      .addColumn("last_update_datetime", "text", (col) => col.notNull())
      .addForeignKeyConstraint(
        "game_described_by_game_metadata_fk",
        ["game_id"],
        "game",
        ["game_id"],
        (cb) => cb.onDelete("cascade"),
      )
      .modifyEnd(sql`STRICT`)
      .execute();
    await trx.schema
      .createIndex("game_metadata_____name")
      .on("game_metadata")
      .column("name")
      .execute();
    await trx.schema
      .createIndex("game_metadata_____last_update_datetime")
      .on("game_metadata")
      .column("last_update_datetime")
      .execute();

    ////////////////////////////////////////////////////////////////////////////
    // author
    //
    await trx.schema
      .createTable("author")
      .addColumn("author_id", "blob", (col) => col.notNull().primaryKey())
      .addColumn("medata_timestamp", "integer", (col) => col.notNull())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("tfgames_site_profile_id", "integer", (col) => col.unique())
      .execute();
    await trx.schema
      .createIndex("author_____name")
      .on("author")
      .column("name")
      .execute();

    await trx.schema
      .createTable("game_author")
      .addColumn("game_id", "blob", (col) => col.notNull())
      .addColumn("author_id", "blob", (col) => col.notNull())
      .addPrimaryKeyConstraint("game_author_pk", ["game_id", "author_id"])
      .addForeignKeyConstraint(
        "game_created_by_author_fk",
        ["game_id"],
        "game",
        ["game_id"],
        (cb) => cb.onDelete("cascade"),
      )
      .addForeignKeyConstraint(
        "author_creates_game_fk",
        ["author_id"],
        "author",
        ["author_id"],
        (cb) => cb.onDelete("cascade"),
      )
      .execute();
    await trx.schema
      .createIndex("game_author_____author_id")
      .on("game_author")
      .column("author_id")
      .execute();

    // the correct thing to do would be to migrate data from
    // game_official_tfgames_author to game_author, but since we are still in
    // pre-release, we can just drop the table

    await trx.schema
      .dropIndex("game_official_tfgames_author_____tfgames_profile_id")
      .execute();
    await trx.schema.dropTable("game_official_tfgames_author").execute();
    await trx.schema.dropTable("tfgames_author").execute();

    ////////////////////////////////////////////////////////////////////////////
    // db views
    //
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await sqliteSafeMigration(db, async (trx) => {
    ////////////////////////////////////////////////////////////////////////////
    // db views
    //

    ////////////////////////////////////////////////////////////////////////////
    // author
    //
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

    await trx.schema.dropIndex("game_author_____author_id").execute();
    await trx.schema.dropTable("game_author").execute();

    await trx.schema.dropIndex("author_____name").execute();
    await trx.schema.dropTable("author").execute();

    ////////////////////////////////////////////////////////////////////////////
    // game_metadata
    //
    await trx.schema
      .dropIndex("game_metadata_____last_update_datetime")
      .execute();
    await trx.schema.dropIndex("game_metadata_____name").execute();
    await trx.schema.dropTable("game_metadata").execute();

    ////////////////////////////////////////////////////////////////////////////
    // game_user_notes
    //
    await trx.schema.dropIndex("game_user_notes_____custom_name").execute();
    await trx.schema
      .dropIndex("game_user_notes_____last_change_datetime")
      .execute();
    await trx.schema
      .dropIndex("game_user_notes_____last_played_datetime")
      .execute();

    await trx.schema
      .alterTable("game_user_notes")
      .renameTo("game_description")
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

    ////////////////////////////////////////////////////////////////////////////
    // tags
    //
  });
}
