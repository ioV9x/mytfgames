import { posix } from "node:path/posix";

import { sql, Transaction } from "kysely";

import {
  AppDatabase,
  AppQueryCreator,
  DatabaseProvider,
  NodeType,
  WellKnownDirectory,
} from "$node-base/database";
import { DbfsErrorCode, makeDbfsError, makeLogicError } from "$pure-base/utils";

interface DbfsMakeDirectoryNodeOptions {
  recursive?: boolean;
}
export async function dbfsMakeDirectoryNode(
  qc: DatabaseProvider,
  path: string,
  options?: DbfsMakeDirectoryNodeOptions,
): Promise<bigint>;
export async function dbfsMakeDirectoryNode(
  qc: DatabaseProvider,
  anchor: bigint,
  path: string,
  options?: DbfsMakeDirectoryNodeOptions,
): Promise<bigint>;
export async function dbfsMakeDirectoryNode(
  qc: DatabaseProvider,
  anchorOrPath: bigint | string,
  pathOrOptions?: string | DbfsMakeDirectoryNodeOptions,
  options?: DbfsMakeDirectoryNodeOptions,
): Promise<bigint> {
  let anchor: bigint;
  let path: string;
  if (typeof anchorOrPath === "string") {
    anchor = WellKnownDirectory.ROOT;
    path = anchorOrPath;
    if (options != null) {
      throw makeLogicError("Unexpected extra options argument");
    }
    if (pathOrOptions == null) {
      options = {};
    } else if (typeof pathOrOptions === "object") {
      options = pathOrOptions;
    } else {
      throw makeLogicError("Unexpected option argument type");
    }
  } else {
    anchor = anchorOrPath;
    if (pathOrOptions == null) {
      throw makeLogicError("Missing path argument");
    } else if (typeof pathOrOptions === "string") {
      path = pathOrOptions;
    } else {
      throw makeLogicError("Unexpected path argument type");
    }
    options ??= {};
  }
  if (anchor !== WellKnownDirectory.ROOT && path.startsWith("/")) {
    throw makeLogicError(
      "Tried to resolve an absolute path with a parent node",
    );
  }

  const fullOptions = {
    recursive: options.recursive ?? false,
  };

  if (qc instanceof Transaction) {
    return dbfsMakeDirectoryNodeImpl(
      qc as Transaction<AppDatabase>,
      anchor,
      path,
      fullOptions,
    );
  }
  return qc.transaction().execute(async (trx) => {
    return dbfsMakeDirectoryNodeImpl(trx, anchor, path, fullOptions);
  });
}

export async function dbfsMakeDirectoryNodeImpl(
  qc: AppQueryCreator,
  parentNo: bigint,
  path: string,
  { recursive }: Required<DbfsMakeDirectoryNodeOptions>,
): Promise<bigint> {
  const normalizedPath = posix.normalize(path);
  const pathSegments = normalizedPath
    .split("/")
    .filter((segment) => segment.length > 0);
  if (pathSegments.length === 0 || normalizedPath === ".") {
    throw makeLogicError("Cannot create a directory without a name");
  } else if (pathSegments[0] === "..") {
    throw makeLogicError("Cannot create a directory above the parent");
  }

  if (pathSegments.length === 1) {
    // fast path for a single segment
    const exists = await qc
      .selectFrom("node_member")
      .innerJoin("node", "node.node_no", "node_member.node_no")
      .select([
        "node_member.node_no",
        "node_member.node_no_parent",
        "node.node_type",
      ])
      .where((eb) =>
        eb.or([
          eb("node_member.node_no", "=", parentNo),
          eb.and([
            eb("node_member.node_no_parent", "=", parentNo),
            eb("node_member.name", "=", pathSegments[0]!),
          ]),
        ]),
      )
      .execute();
    if (exists.length === 0) {
      if (parentNo !== WellKnownDirectory.ROOT) {
        throw makeDbfsError(DbfsErrorCode.ENOENT, "Parent node does not exist");
      }
      // else fall through to create the directory
    } else if (exists.length === 1) {
      if (parentNo === WellKnownDirectory.ROOT) {
        if (exists[0]!.node_type !== NodeType.DIRECTORY) {
          throw makeDbfsError(DbfsErrorCode.EEXIST, "Node is not a directory");
        }
        return BigInt(exists[0]!.node_no);
      }
      if (exists[0]!.node_type !== NodeType.DIRECTORY) {
        throw makeDbfsError(
          DbfsErrorCode.EEXIST,
          "Parent node is not a directory",
        );
      }
      // else fall through to create the directory
    } else if (exists.length === 2) {
      const entry =
        exists[0]!.node_no_parent === parentNo ? exists[0]! : exists[1]!;
      if (entry.node_type !== NodeType.DIRECTORY) {
        throw makeDbfsError(DbfsErrorCode.EEXIST, "Node is not a directory");
      }
      return BigInt(entry.node_no);
    } else {
      throw makeLogicError("Unexpected result from node_member query");
    }
    return dbfsMakeSimpleDirectoryNode(qc, parentNo, pathSegments[0]!);
  }

  const pathAsJsonArray = JSON.stringify(pathSegments);

  const insertionPoint = await qc
    .withRecursive("path_segment", (ctec) =>
      ctec
        .selectFrom(sql`json_each(${pathAsJsonArray})`.as("pathp"))
        .select(sql<number>`row_number() over ()`.as("segment_no"))
        .select(sql<string>`"pathp"."value"`.as("segment")),
    )
    .withRecursive("ids", (ctec) =>
      ctec

        .selectFrom(["node"])
        .select("node.node_no")
        .select(sql<bigint>`-1`.as("node_no_parent"))
        // i is the _next_ segment number on an one-based sequence
        .select(sql<bigint>`1`.as("i"))
        .where("node.node_no", "=", parentNo)
        .unionAll((uac) =>
          uac
            .selectFrom("ids")
            .innerJoin("path_segment", "path_segment.segment_no", "ids.i")
            .innerJoin("node_member", (join) =>
              join
                .onRef("node_member.node_no_parent", "=", "ids.node_no")
                .onRef("node_member.name", "=", "path_segment.segment"),
            )
            .select(["node_member.node_no", "node_member.node_no_parent"])
            .select(sql<bigint>`"ids"."i" + 1`.as("i")),
        )
        .orderBy("i"),
    )
    .selectFrom("ids")
    .innerJoin("node", "node.node_no", "ids.node_no")
    .select(["ids.node_no", "ids.node_no_parent", "ids.i", "node.node_type"])
    .orderBy("i", "desc")
    .limit(1)
    .executeTakeFirst();

  if (insertionPoint == null) {
    throw makeDbfsError(DbfsErrorCode.ENOENT, "Parent node does not exist");
  }
  if (insertionPoint.node_no_parent === parentNo) {
    if (insertionPoint.node_type === NodeType.DIRECTORY) {
      return BigInt(insertionPoint.node_no);
    }
    throw makeDbfsError(DbfsErrorCode.EEXIST, "Node is not a directory");
  }
  if (insertionPoint.node_type !== NodeType.DIRECTORY) {
    throw makeDbfsError(DbfsErrorCode.EEXIST, "Parent node is not a directory");
  }
  if (!recursive && Number(insertionPoint.i) !== pathSegments.length) {
    throw makeDbfsError(DbfsErrorCode.ENOENT, "Parent node does not exist");
  }

  let currentParentNodeNo = insertionPoint.node_no;
  for (let i = Number(insertionPoint.i) - 1; i < pathSegments.length; ++i) {
    const currentSegment = pathSegments[i]!;
    const node_no = await dbfsMakeSimpleDirectoryNode(
      qc,
      currentParentNodeNo,
      currentSegment,
    );
    currentParentNodeNo = node_no;
  }

  return BigInt(currentParentNodeNo);
}

async function dbfsMakeSimpleDirectoryNode(
  qc: AppQueryCreator,
  node_no_parent: bigint,
  name: string,
): Promise<bigint> {
  const insertRx = await qc
    .insertInto("node")
    .values({ node_type: "D" })
    .executeTakeFirst();
  if (insertRx.insertId == null) {
    throw makeLogicError("Failed to create a directory node");
  }
  const node_no = BigInt(insertRx.insertId);
  await Promise.all([
    qc.insertInto("node_directory").values({ directory_no: node_no }).execute(),
    qc
      .insertInto("node_member")
      .values({ node_no, name, node_no_parent })
      .execute(),
  ]);
  return node_no;
}
