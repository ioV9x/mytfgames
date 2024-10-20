import { sql } from "kysely";

import { AppQueryCreator, WellKnownDirectory } from "$node-base/database";
import { makeLogicError } from "$pure-base/utils";

/**
 * Resolves a path to a node number. The path is resolved relative to the root node.
 *
 * @param qc The query creator, either the database connection or a transaction
 * @param path The path to resolve
 * @returns The node number of the resolved path or undefined if not found
 */
export async function dbfsFindNodeNoByPath(
  qc: AppQueryCreator,
  path: string,
): Promise<bigint | undefined>;
/**
 * Resolves a path to a node number. The path is resolved relative to the anchor node.
 * If the path is absolute, the anchor node must be the root node.
 *
 * @param qc The query creator, either the database connection or a transaction
 * @param anchor Search starting point, defaults to the root node
 * @param path The path to resolve
 * @returns The node number of the resolved path or undefined if not found
 */
export async function dbfsFindNodeNoByPath(
  qc: AppQueryCreator,
  anchor: bigint,
  path: string,
): Promise<bigint | undefined>;
export async function dbfsFindNodeNoByPath(
  qc: AppQueryCreator,
  anchorOrPath: bigint | string,
  path?: string,
): Promise<bigint | undefined> {
  let parentNo: bigint;
  if (typeof anchorOrPath !== "string") {
    if (path === undefined) {
      throw makeLogicError("Missing path argument");
    }
    parentNo = anchorOrPath;
  } else {
    if (path !== undefined) {
      throw makeLogicError("Unexpected path argument");
    }
    parentNo = WellKnownDirectory.ROOT;
    path = anchorOrPath;
  }
  if (parentNo !== WellKnownDirectory.ROOT && path.startsWith("/")) {
    throw makeLogicError(
      "Tried to resolve an absolute path with a parent node",
    );
  }
  const pathSegments = path.split("/").filter((segment) => segment.length > 0);
  if (pathSegments.length === 0) {
    // ensure that the parent node exists
    const rr = await qc
      .selectFrom("node")
      .select("node_no")
      .where("node_no", "=", parentNo)
      .executeTakeFirst();
    return rr === undefined ? rr : BigInt(rr.node_no);
  }
  const pathAsJsonArray = JSON.stringify(pathSegments);

  const rr = await qc
    .withRecursive("path_segment", (ctec) =>
      ctec
        .selectFrom(sql`json_each(${pathAsJsonArray})`.as("pathp"))
        .select(sql<number>`row_number() over ()`.as("segment_no"))
        .select(sql<string>`pathp.value`.as("segment")),
    )
    .withRecursive("ids", (ctec) =>
      ctec
        .selectFrom(["node_member"])
        .select(["node_member.node_no", "node_member.node_no_parent"])
        .select(sql<bigint>`2`.as("i"))
        .where("node_member.node_no_parent", "=", parentNo)
        .where("node_member.name", "=", pathSegments[0]!)
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
            .select(sql<bigint>`ids.i + 1`.as("i"))
            .orderBy("i"),
        ),
    )
    .selectFrom("ids")
    .selectAll()
    .where("i", "=", BigInt(pathSegments.length) + 1n)
    .executeTakeFirst();

  return rr === undefined ? rr : BigInt(rr.node_no);
}
