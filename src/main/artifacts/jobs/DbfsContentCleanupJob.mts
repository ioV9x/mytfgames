import { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

import { sql } from "kysely";
import * as R from "remeda";

import { AppConfiguration } from "$node-base/configuration";
import { DatabaseProvider } from "$node-base/database";
import { dbfsPurgeUnreferencedFileData } from "$node-base/database-fs";
import { Job } from "$node-base/job-scheduling";
import { isErrnoException } from "$node-base/utils";

const blobSubDirPattern = /^[0-9a-fA-F]{3}$/;
const blobNamePattern = /^[0-9a-fA-F]{64}$/;
function isBlobSubDir(ent: Dirent): boolean {
  return ent.isDirectory() && blobSubDirPattern.test(ent.name);
}

export class DbfsContentCleanupJob implements Job {
  readonly id: string;

  constructor(
    private readonly configuration: AppConfiguration,
    private readonly db: DatabaseProvider,
  ) {
    this.id = `dbfs-content-cleanup`;
  }

  async run(): Promise<void> {
    const numDeleted = await this.db.transaction().execute(async (trx) => {
      const result = await trx
        .deleteFrom("node_file_content")
        .where((eb) =>
          eb.not(
            eb.exists(
              eb
                .selectFrom("node_file")
                .select("node_file.file_no")
                .whereRef(
                  "node_file.blake3_hash",
                  "=",
                  "node_file_content.blake3_hash",
                ),
            ),
          ),
        )
        .executeTakeFirstOrThrow();

      return result.numDeletedRows;
    });
    if (numDeleted > 0) {
      await sql<void>`VACUUM`.execute(this.db);
    }

    // we don't use readdir in recursive mode because the directory structure
    // provides a natural way to chunk the blobs and it reduces the number of
    // TOCTOU failures
    const blobStorePath = this.configuration.root.paths.blob_store;
    const rootDirs = await readdir(blobStorePath, { withFileTypes: true });
    for (const rootDir of rootDirs.filter(isBlobSubDir)) {
      const subDirPath = path.join(blobStorePath, rootDir.name);
      let subDirs: Dirent[];
      try {
        subDirs = await readdir(subDirPath, { withFileTypes: true });
      } catch (error) {
        if (isErrnoException(error) && error.code === "ENOENT") {
          continue;
        }
        throw error;
      }
      for (const subDir of subDirs.filter(isBlobSubDir)) {
        const subSubDirPath = path.join(subDirPath, subDir.name);
        let blobEnts: Dirent[];
        try {
          blobEnts = await readdir(subSubDirPath, { withFileTypes: true });
        } catch (error) {
          if (isErrnoException(error) && error.code === "ENOENT") {
            continue;
          }
          throw error;
        }

        await dbfsPurgeUnreferencedFileData(
          this.configuration,
          this.db,
          R.pipe(
            blobEnts,
            R.filter((e) => e.isFile() && blobNamePattern.test(e.name)),
            R.sortBy((e) => e.name),
            R.map((e) => ({
              path: path.join(subSubDirPath, e.name),
              hash: Buffer.from(e.name, "hex"),
            })),
          ),
        );
      }
    }
  }
}
