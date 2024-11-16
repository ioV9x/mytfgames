import { Kysely } from "kysely";

import { sqliteSafeMigration } from "$node-base/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await sqliteSafeMigration(db, async (trx) => {
    ////////////////////////////////////////////////////////////////////////////
    // tags
    //
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
    // tags
    //
  });
}
