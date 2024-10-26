import { Dirent } from "node:fs";
import { readdir, unlink } from "node:fs/promises";
import path from "node:path";

import { sql } from "kysely";
import * as R from "remeda";

import { Job } from "$main/pal";
import { AppConfiguration } from "$node-base/configuration";
import { DatabaseProvider } from "$node-base/database";
import { isErrnoException } from "$node-base/utils";
import { sortedDifferenceBy } from "$pure-base/utils";

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

        for (const blobEntChunk of R.pipe(
          blobEnts,
          R.filter((e) => e.isFile() && blobNamePattern.test(e.name)),
          R.sortBy((e) => e.name),
          R.map((e) => ({
            path: path.join(subSubDirPath, e.name),
            hash: Buffer.from(e.name, "hex"),
          })),
          R.chunk(768),
        )) {
          await this.#purgeUnreferencedBlobs(blobEntChunk);
        }
      }
    }
  }

  async #purgeUnreferencedBlobs(blobEnts: { path: string; hash: Buffer }[]) {
    await this.db.connection().execute(async (conn) => {
      await sql<void>`BEGIN IMMEDIATE TRANSACTION`.execute(conn);
      try {
        const knownExternalEntries = await conn
          .selectFrom("node_file_content")
          .select("blake3_hash as hash")
          .where(
            "blake3_hash",
            "in",
            blobEnts.map((e) => e.hash),
          )
          .where("data", "is", null)
          .execute();

        const toBeRemoved = sortedDifferenceBy(
          blobEnts,
          knownExternalEntries,
          (e) => e.hash,
          // Buffer.compare is not an instance method
          // eslint-disable-next-line @typescript-eslint/unbound-method
          Buffer.compare,
        );

        await Promise.allSettled(
          toBeRemoved.map(async ({ path }) => {
            try {
              await unlink(path);
            } catch (e) {
              if (!isErrnoException(e) || e.code !== "ENOENT") {
                throw e;
              }
            }
          }),
        );

        await sql<void>`COMMIT TRANSACTION`.execute(conn);
      } catch (error) {
        try {
          await sql<void>`ROLLBACK TRANSACTION`.execute(conn);
        } catch {
          /* swallow */
          // TODO: log this failure
        }
        throw error;
      }
    });
  }
}
