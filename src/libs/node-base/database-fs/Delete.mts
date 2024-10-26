import { unlink } from "node:fs/promises";

import { sql } from "kysely";

import { AppConfiguration } from "$node-base/configuration";
import { DatabaseProvider } from "$node-base/database";
import { isErrnoException, sortedDifferenceBy } from "$pure-base/utils";

import { dbfsHashToFullBlobPath } from "./Utility.mjs";

/* Must not (and can not) be called from the transaction which removes the
 * `node_file_content` entries for the blobs. Otherwise the blobs would be
 * removed from disk before the transaction is committed. This operation ensures
 * that no new references to the blobs have been created in the meantime.
 */
export async function dbfsPurgeUnreferencedFileData(
  configuration: AppConfiguration,
  db: DatabaseProvider,
  blobEnts: Buffer[] | { path: string; hash: Buffer }[],
): Promise<void> {
  if (blobEnts.length === 0) {
    return;
  }
  if (Buffer.isBuffer(blobEnts[0])) {
    blobEnts = (blobEnts as Buffer[]).map((hash) => ({
      hash,
      path: dbfsHashToFullBlobPath(configuration, hash),
    }));
  } else {
    blobEnts = blobEnts as { path: string; hash: Buffer }[];
  }

  await db.connection().execute(async (conn) => {
    await sql<void>`BEGIN IMMEDIATE TRANSACTION`.execute(conn);
    try {
      const blobHashes = blobEnts.map((e) => e.hash);
      const knownExternalEntries = await conn
        .selectFrom("node_file_content")
        .select("blake3_hash as hash")
        .where("blake3_hash", "in", blobHashes)
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
