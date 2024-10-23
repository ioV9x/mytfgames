import { Generated } from "kysely";

export const NodeType = Object.freeze(
  Object.assign(
    Object.create(null) as object,
    {
      DIRECTORY: "D",
      FILE: "F",
    } as const,
  ),
);
export interface NodeTypeTable {
  node_type: "F" | "D";
  name: string;
}

/**
 * Well-known directory numbers.
 *
 * These can be used to refer to well-known directories in the database. They
 * are allocated in the negative range to avoid conflicts with user-defined
 * directories. The sqlite algorithm for primary integer keys is to use the
 * smallest available integer, so we can use the negative range to avoid any
 * conflicts.
 *
 * The node entries for these directories are created by the migration logic.
 */
export const WellKnownDirectory = Object.freeze(
  Object.assign(
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    Object.create(null) as {},
    {
      ROOT: 0n,
      INVALID: -1n,

      ARTIFACTS: -3n,
      CLEANUP_QUEUE: -4n,
      TMP_IMPORT: -129n,
      TMP: -2n,
    } as const,
  ),
);
export interface NodeTable {
  node_no: Generated<bigint>;
  node_type: string;
}

export interface NodeDirectoryTable {
  directory_no: bigint;
}
export interface NodeMemberTable {
  node_no: bigint;
  name: string;
  node_no_parent: bigint;
}

export interface NodeFileTable {
  file_no: bigint;
  unix_mode: number;
  blake3_hash: Buffer;
}

export interface NodeFileContentTable {
  blake3_hash: Buffer;
  size: bigint;
  /**
   * The content of the file. If NULL, the file is stored directly in the FS.
   */
  data: Buffer | null;
}
