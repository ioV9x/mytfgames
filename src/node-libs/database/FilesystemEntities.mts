export interface NodeTypeTable {
  node_type: string;
  name: string;
}

export interface NodeTable {
  node_no: number;
  node_type: string;
}

export interface NodeDirectoryTable {
  directory_no: number;
}
export interface NodeMemberTable {
  node_no: number;
  name: string;
  node_no_parent: number;
}

export interface NodeFileTable {
  file_no: number;
  unix_mode: number;
  blake3_hash: string;
}

export interface NodeFileContentTable {
  blake3_hash: string;
  size: bigint;
  /**
   * The content of the file. If NULL, the file is stored directly in the FS.
   */
  data: Buffer | null;
}
