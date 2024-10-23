import assert from "node:assert";
import { createReadStream, createWriteStream, Dirent } from "node:fs";
import {
  constants,
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  stat,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { blake3, Blake3Hasher } from "@napi-rs/blake-hash";
import { inject, injectable } from "inversify";
import * as R from "remeda";
import { TransformCallback } from "stream";

import { ArtifactIoServiceDescriptor } from "$ipc/worker-main";
import { AppConfiguration } from "$node-base/configuration";
import { AppQueryCreator, DatabaseProvider } from "$node-base/database";
import { collectAsyncIterable, isErrnoException } from "$node-base/utils";
import { remoteProcedure } from "$pure-base/ipc";

const EXTERNAL_BLOB_STORAGE_THRESHOLD = 32n * 1024n;

interface DirectoryNode {
  files: [string, Buffer][];
  directories: [string, DirectoryNode][];
}

@injectable()
export class NodeArtifactIoService {
  private readonly importsDir: string;

  constructor(
    @inject(AppConfiguration) private readonly configuration: AppConfiguration,
    @inject(DatabaseProvider) private readonly database: DatabaseProvider,
  ) {
    this.importsDir = path.join(
      this.configuration.root.paths.blob_store,
      "_imports",
    );
  }

  @remoteProcedure(ArtifactIoServiceDescriptor, "importFromFsNode")
  async importFromFsNode(fsPath: string, targetNode: bigint): Promise<void> {
    if (!statSync(fsPath).isDirectory()) {
      throw makeLogicError(
        "Only directories are currently supported for fs imports",
      );
    }
    try {
      await mkdir(this.importsDir);
    } catch (error) {
      if (!isErrnoException(error) || error.code !== "EEXIST") {
        throw error;
      }
    }
    const stageDir = await mkdtemp(path.join(this.importsDir, "stage-"));

    const importOperation = new ImportOperation(
      this.configuration.root.paths.blob_store,
      stageDir,
      this.database,
    );
    await importOperation.run(targetNode, fsPath, new AbortController().signal);
  }
}

class ImportOperation {
  private blobTempIdGen = 1;

  constructor(
    private readonly blobStorePath: string,
    private readonly stageDirPath: string,
    private readonly database: DatabaseProvider,
  ) {}

  async run(
    rootNode: bigint,
    folderPath: string,
    signal: AbortSignal,
  ): Promise<void> {
    // first reap the directory structure and import all files into our
    // content addressable storage. This is the most time consuming part of the
    // operation. We do this first to avoid having to lock the database for a
    // long time. If we fail during this step, unused files will be cleaned up
    // by the garbage collection on next startup.
    let tree: DirectoryNode;
    try {
      tree = await this.reapDirectory(folderPath, signal);
    } catch (error) {
      // cleanup the temporary directory
      await rm(this.stageDirPath, { recursive: true });
      throw error;
    }
    await rmdir(this.stageDirPath);

    // then replicate the directory structure in the database
    await this.database.transaction().execute(async (tx) => {
      const queue: [bigint, DirectoryNode][] = [[rootNode, tree]];

      while (queue.length !== 0) {
        const [dirNo, { files, directories }] = queue.shift()!;
        await Promise.all(
          files.map(([name, fileHash]) =>
            this.insertFileNode(tx, dirNo, name, fileHash),
          ),
        );

        const subdirs = await Promise.all(
          directories.map(
            async ([name, subdir]) =>
              [await this.insertDirectoryNode(tx, dirNo, name), subdir] as [
                bigint,
                DirectoryNode,
              ],
          ),
        );
        queue.push(...subdirs);
      }
    });
  }

  private async insertFileNode(
    qc: AppQueryCreator,
    node_no_parent: bigint,
    name: string,
    fileHash: Buffer,
  ): Promise<void> {
    const nodeInsertResult = await qc
      .insertInto("node")
      .values({
        node_type: "F",
      })
      .execute();
    assert(nodeInsertResult.length === 1);
    assert(nodeInsertResult[0]!.insertId != null);
    const node_no = nodeInsertResult[0]!.insertId;

    await Promise.all([
      qc
        .insertInto("node_file")
        .values({
          file_no: node_no,
          unix_mode: 0o644,
          blake3_hash: fileHash,
        })
        .execute(),
      qc
        .insertInto("node_member")
        .values({
          node_no,
          name,
          node_no_parent,
        })
        .execute(),
    ]);
  }
  private async insertDirectoryNode(
    qc: AppQueryCreator,
    node_no_parent: bigint,
    name: string,
  ): Promise<bigint> {
    const nodeInsertResult = await qc
      .insertInto("node")
      .values({
        node_type: "D",
      })
      .execute();
    assert(nodeInsertResult.length === 1);
    assert(nodeInsertResult[0]!.insertId != null);
    const node_no = nodeInsertResult[0]!.insertId;

    await Promise.all([
      qc
        .insertInto("node_directory")
        .values({
          directory_no: node_no,
        })
        .execute(),
      qc
        .insertInto("node_member")
        .values({
          node_no,
          name,
          node_no_parent,
        })
        .execute(),
    ]);

    return node_no;
  }

  private async reapDirectory(
    directoryPath: string,
    signal: AbortSignal,
  ): Promise<DirectoryNode> {
    const fileEntries: Dirent[] = [];
    const subdirectoryEntries: Dirent[] = [];
    for await (const item of await readdir(directoryPath, {
      withFileTypes: true,
    })) {
      if (item.isDirectory()) {
        subdirectoryEntries.push(item);
      } else if (item.isFile()) {
        fileEntries.push(item);
      }
    }

    const files: [string, Buffer][] = await Promise.all(
      fileEntries.map(async (fileEntry) => {
        const filePath = path.join(directoryPath, fileEntry.name);
        return [fileEntry.name, await this.importFile(filePath, signal)];
      }),
    );
    const subdirectories: [string, DirectoryNode][] = [];
    for (const directoryEntry of subdirectoryEntries) {
      const subdirectoryPath = path.join(directoryPath, directoryEntry.name);
      const subdirectory = await this.reapDirectory(subdirectoryPath, signal);
      subdirectories.push([directoryEntry.name, subdirectory]);
    }

    return {
      files: R.sortBy(files, ([name]) => name),
      directories: R.sortBy(subdirectories, ([name]) => name),
    };
  }

  private async importFile(
    filePath: string,
    signal: AbortSignal,
  ): Promise<Buffer> {
    const { size } = await stat(filePath, { bigint: true });
    if (size <= EXTERNAL_BLOB_STORAGE_THRESHOLD) {
      return this.importSmallFile(filePath, signal);
    } else {
      return this.importLargeFile(filePath, signal);
    }
  }

  private async importSmallFile(
    filePath: string,
    signal: AbortSignal,
  ): Promise<Buffer> {
    const content = await readFile(filePath, {
      signal,
    });
    const fileHash = blake3(content);
    await this.insertFileContent(fileHash, content.length, content);
    return fileHash;
  }

  private async importLargeFile(
    filePath: string,
    signal: AbortSignal,
  ): Promise<Buffer> {
    const blobTempId = this.nextBlobTempId();
    const blobTempPath = path.join(this.stageDirPath, blobTempId);
    let fileHash: Buffer;
    if (platform() === "win32") {
      // libuv does not support file cloning on Windows, so we always have to
      // copy the file. Might need to revisit this after Win11 ships an
      // automatic CoW copy optimization for CopyFile on ReFS.
      fileHash = await this.copyFileTo(filePath, blobTempPath, signal);
    } else {
      try {
        fileHash = await this.cloneFileTo(filePath, blobTempPath, signal);
      } catch (error) {
        if (isErrnoException(error) && error.code === "ENOSYS") {
          // Fallback to copying the file if cloning is not supported
          fileHash = await this.copyFileTo(filePath, blobTempPath, signal);
        } else {
          throw error;
        }
      }
    }
    const size = (await stat(blobTempPath, { bigint: true })).size;
    const newlyInserted = await this.insertFileContent(fileHash, size, null);
    if (!newlyInserted) {
      // The file is already in the store, remove the temporary file
      await unlink(blobTempPath);
      return fileHash;
    }

    const fileName = fileHash.toString("hex");
    const subDirectory = path.join(
      this.blobStorePath,
      fileName.substring(0, 3),
      fileName.substring(3, 6),
    );
    await mkdir(subDirectory, { recursive: true });
    await rename(blobTempPath, path.join(subDirectory, fileName));

    return fileHash;
  }

  private async insertFileContent(
    blake3_hash: Buffer,
    size: bigint | number,
    data: Buffer | null,
  ): Promise<boolean> {
    const insertResult = await this.database
      .insertInto("node_file_content")
      .values({
        blake3_hash,
        size: BigInt(size),
        data,
      })
      .onConflict((oc) => oc.column("blake3_hash").doNothing())
      .execute();

    return (
      insertResult.length === 1 &&
      insertResult[0]!.numInsertedOrUpdatedRows === 1n
    );
  }

  private async cloneFileTo(
    sourcePath: string,
    targetPath: string,
    signal: AbortSignal,
  ): Promise<Buffer> {
    await copyFile(sourcePath, targetPath, constants.COPYFILE_FICLONE_FORCE);
    const contentStream = createReadStream(targetPath, { signal });
    let fileHash: Buffer;
    await pipeline(
      contentStream,
      new Blake3Stream(),
      async (hash) => {
        fileHash = Buffer.concat(await collectAsyncIterable(hash));
      },
      {
        signal,
      },
    );
    return fileHash!;
  }
  private async copyFileTo(
    sourcePath: string,
    targetPath: string,
    signal: AbortSignal,
  ): Promise<Buffer> {
    const contentStream = createReadStream(sourcePath, { signal });
    const targetStream = createWriteStream(targetPath, { signal });
    let fileHash: Buffer;
    await Promise.all([
      pipeline(contentStream, targetStream, {
        signal,
      }),
      pipeline(
        contentStream,
        new Blake3Stream(),
        async (hash) => {
          fileHash = Buffer.concat(await collectAsyncIterable(hash));
        },
        {
          signal,
        },
      ),
    ]);
    return fileHash!;
  }

  private nextBlobTempId(): string {
    return (this.blobTempIdGen++).toString(32);
  }
}

class Blake3Stream extends Transform {
  readonly #context = new Blake3Hasher();

  override _transform(
    chunk: unknown,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk as string, encoding);

    this.#context.update(buffer);
    callback(null);
  }

  override _flush(callback: TransformCallback): void {
    this.push(this.#context.digestBuffer());
    this.#context.reset();
    callback(null);
  }
}
