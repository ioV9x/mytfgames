import { Generated } from "kysely";

export interface NodeTypeTable {
  node_type: "F" | "D";
  name: string;
}

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
