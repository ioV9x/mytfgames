import { DatabaseSync } from "node:sqlite";

import { Kysely, Migrator } from "kysely";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  AppDatabase,
  ViteMigrationProvider,
  WellKnownDirectory,
} from "$node-base/database";

import { NodeSqliteDialect } from "../database/kysely-support/NodeSqliteDialect.mjs";
import { dbfsMakeDirectoryNode } from "./Create.mjs";

describe("database-fs:Create", () => {
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

  describe("dbfsMakeDirectoryNode", () => {
    it("creates a simple subdirectory node", async () => {
      const nodeNo = await dbfsMakeDirectoryNode(db, "test");
      expect(nodeNo).toBe(2008n);

      const node = await db
        .selectFrom("node")
        .selectAll()
        .where("node.node_no", "=", nodeNo)
        .execute();
      expect(node).toMatchObject([{ node_no: 2008, node_type: "D" }]);

      const member = await db
        .selectFrom("node_member")
        .selectAll()
        .where("node_member.node_no", "=", nodeNo)
        .execute();
      expect(member).toMatchObject([
        {
          node_no: 2008,
          node_no_parent: Number(WellKnownDirectory.ROOT),
          name: "test",
        },
      ]);
    });

    it.each([
      ["test", WellKnownDirectory.ROOT, { node_no: 2008, name: "test" }],
      ["test", WellKnownDirectory.TMP_IMPORT, { node_no: 2008, name: "test" }],
      [
        "tmp/t4",
        WellKnownDirectory.ROOT,
        {
          node_no: 2008,
          node_no_parent: Number(WellKnownDirectory.TMP),
          name: "t4",
        },
      ],
      [
        "import/t4",
        WellKnownDirectory.TMP,
        {
          node_no: 2008,
          node_no_parent: Number(WellKnownDirectory.TMP_IMPORT),
          name: "t4",
        },
      ],
    ])("creates a simple directory node", async (path, parent, expected) => {
      const nodeNo = await dbfsMakeDirectoryNode(db, parent, path);
      expect(nodeNo).toBe(BigInt(expected.node_no));

      const node = await db
        .selectFrom("node")
        .selectAll()
        .where("node.node_no", "=", nodeNo)
        .execute();
      expect(node).toMatchObject([
        { node_no: expected.node_no, node_type: "D" },
      ]);

      const member = await db
        .selectFrom("node_member")
        .selectAll()
        .where("node_member.node_no", "=", nodeNo)
        .execute();
      expect(member).toMatchObject([
        {
          node_no_parent: Number(parent),
          ...expected,
        },
      ]);
    });
    it.each([
      [
        "tx/t3",
        WellKnownDirectory.ROOT,
        { node_no: 2009, node_no_parent: 2008, name: "t3" },
      ],
      ["t2/t3", 2001n, { node_no: 2009, node_no_parent: 2008, name: "t3" }],
    ])("creates a deep directory structure", async (path, parent, expected) => {
      const nodeNo = await dbfsMakeDirectoryNode(db, parent, path, {
        recursive: true,
      });
      expect(nodeNo).toBe(BigInt(expected.node_no));

      const node = await db
        .selectFrom("node")
        .selectAll()
        .where("node.node_no", "=", nodeNo)
        .execute();
      expect(node).toMatchObject([
        { node_no: expected.node_no, node_type: "D" },
      ]);

      const member = await db
        .selectFrom("node_member")
        .selectAll()
        .where("node_member.node_no", "=", nodeNo)
        .execute();
      expect(member).toMatchObject([expected]);
    });
    it("throws an error if the parent node does not exist", async () => {
      await expect(
        dbfsMakeDirectoryNode(db, 9999n, "test"),
      ).rejects.toThrowErrorMatchingSnapshot();
    });
  });
});
