import { DatabaseSync } from "node:sqlite";

import { Kysely, Migrator } from "kysely";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  AppDatabase,
  ViteMigrationProvider,
  WellKnownDirectory,
} from "$node-base/database";

import { NodeSqliteDialect } from "../database/kysely-support/NodeSqliteDialect.mjs";
import { dbfsFindNodeNoByPath } from "./Lookup.mjs";

describe("database-fs:Lookup", () => {
  let db: Kysely<AppDatabase>;

  beforeEach(async () => {
    db = new Kysely<AppDatabase>({
      dialect: new NodeSqliteDialect({
        database: new DatabaseSync(":memory:"),
      }),
      log: ["error"],
    });
    const migrator = new Migrator({
      db,
      provider: new ViteMigrationProvider(),
    });
    const migration = await migrator.migrateToLatest();
    if (migration.error != null) {
      throw new Error("Failed to migrate the database schema", {
        cause: migration.error,
      });
    }

    await db
      .insertInto("node")
      .values([
        { node_type: "D", node_no: 2001n },
        { node_type: "D", node_no: 2002n },
        { node_type: "D", node_no: 2003n },
        { node_type: "D", node_no: 2004n },
        { node_type: "D", node_no: 2005n },
        { node_type: "D", node_no: 2006n },
        { node_type: "D", node_no: 2007n },
      ])
      .execute();
    await db
      .insertInto("node_directory")
      .values([
        { directory_no: 2001n },
        { directory_no: 2002n },
        { directory_no: 2003n },
        { directory_no: 2004n },
        { directory_no: 2005n },
        { directory_no: 2006n },
        { directory_no: 2007n },
      ])
      .execute();
    await db
      .insertInto("node_member")
      .values([
        { node_no: 2001n, node_no_parent: WellKnownDirectory.TMP, name: "a" },
        { node_no: 2002n, node_no_parent: WellKnownDirectory.ROOT, name: "b" },
        { node_no: 2003n, node_no_parent: 2001n, name: "c" },
        { node_no: 2004n, node_no_parent: 2001n, name: "d" },
        { node_no: 2005n, node_no_parent: 2004n, name: "e" },
        { node_no: 2006n, node_no_parent: 2004n, name: "f" },
        { node_no: 2007n, node_no_parent: 2005n, name: "g" },
      ])
      .execute();
  });
  afterEach(() => {
    return db.destroy();
  });

  describe("dbfsFindNodeNoByPath", () => {
    it("should throw an error for absolute paths with a parent node", async () => {
      await expect(
        dbfsFindNodeNoByPath(db, 2005n, "/tmp/a/d/e"),
      ).rejects.toThrowErrorMatchingSnapshot();
    });
    it("should retrieve the correct node no from root", async () => {
      await expect(dbfsFindNodeNoByPath(db, "/tmp/a/d/e")).resolves.toBe(2005n);
    });
    it("should retrieve the correct node no from an intermediate directory", async () => {
      await expect(
        dbfsFindNodeNoByPath(db, WellKnownDirectory.TMP, "a/d/f"),
      ).resolves.toBe(2006n);
    });
    it("should return undefined for non-existent paths", async () => {
      await expect(
        dbfsFindNodeNoByPath(db, "/tmp/a/d/x"),
      ).resolves.toBeUndefined();
    });
    it("should return the parent node no for empty paths", async () => {
      await expect(dbfsFindNodeNoByPath(db, 2005n, "")).resolves.toBe(2005n);
    });
    it("should return undefined for empty paths with a non-existent parent", async () => {
      await expect(
        dbfsFindNodeNoByPath(db, 9999n, ""),
      ).resolves.toBeUndefined();
    });
    it("should return undefined for a path starting with a non-existent parent", async () => {
      await expect(
        dbfsFindNodeNoByPath(db, 9999n, "a/d/e"),
      ).resolves.toBeUndefined();
    });
  });
});
