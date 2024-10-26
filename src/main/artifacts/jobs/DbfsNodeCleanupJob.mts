import { sql } from "kysely";
import * as R from "remeda";

import { Job } from "$main/pal";
import { AppConfiguration } from "$node-base/configuration";
import { DatabaseProvider } from "$node-base/database";
import { dbfsPurgeUnreferencedFileData } from "$node-base/database-fs";

export class DbfsNodeCleanupJob implements Job {
  readonly id: string;

  constructor(
    private readonly configuration: AppConfiguration,
    private readonly db: DatabaseProvider,
    private readonly nodeNo: bigint,
    private readonly unlinkBlobs = false,
  ) {
    this.id = `dbfs-node-cleanup-${nodeNo}`;
  }

  async run(): Promise<void> {
    const cleanupHashes = await this.db.transaction().execute(async (trx) => {
      await trx
        .withRecursive("node_to_delete", (ctec) =>
          ctec
            .selectFrom("node_member")
            .select("node_no")
            .where("node_no", "=", this.nodeNo)
            .unionAll((uac) =>
              uac
                .selectFrom("node_to_delete")
                .select("node_member.node_no")
                .innerJoin(
                  "node_member",
                  "node_member.node_no_parent",
                  "node_to_delete.node_no",
                ),
            ),
        )
        .deleteFrom("node_member")
        .where((eb) =>
          eb.exists(
            eb
              .selectFrom("node_to_delete")
              .select("node_to_delete.node_no")
              .whereRef("node_to_delete.node_no", "=", "node_member.node_no"),
          ),
        )
        .execute();

      const [maybeHashes] = await Promise.all([
        trx
          .deleteFrom("node_file")
          .where((eb) =>
            eb.not(
              eb.exists(
                eb
                  .selectFrom("node_member")
                  .select("node_member.node_no")
                  .whereRef("node_member.node_no", "=", "node_file.file_no"),
              ),
            ),
          )
          .$if(this.unlinkBlobs, (qb) => qb.returning("blake3_hash as value"))
          .execute(),
        trx
          .deleteFrom("node_directory")
          .where((eb) =>
            eb.and([
              eb.not(
                eb.exists(
                  eb
                    .selectFrom("node_member")
                    .select("node_member.node_no")
                    .whereRef(
                      "node_member.node_no",
                      "=",
                      "node_directory.directory_no",
                    ),
                ),
              ),
              eb("node_directory.directory_no", "!=", 0n),
            ]),
          )
          .execute(),
      ]);

      await trx
        .deleteFrom("node")
        .where((eb) =>
          eb.and([
            eb.not(
              eb.exists(
                eb
                  .selectFrom("node_member")
                  .select("node_member.node_no")
                  .whereRef("node_member.node_no", "=", "node.node_no"),
              ),
            ),
            eb("node.node_no", "!=", 0n),
          ]),
        )
        .execute();

      return this.unlinkBlobs
        ? // eslint-disable-next-line @typescript-eslint/unbound-method
          maybeHashes.map(({ value }) => value!).sort(Buffer.compare)
        : undefined;
    });

    if (cleanupHashes) {
      for (const chunk of R.chunk(cleanupHashes, 2 ** 16)) {
        const blobs = await this.db.transaction().execute(async (trx) => {
          const deleteResult = await trx
            .deleteFrom("node_file_content")
            .where((eb) =>
              eb.not(
                eb.exists(
                  eb
                    .selectFrom("node_file")
                    .select(sql<number>`1`.as("x"))
                    .whereRef(
                      "node_file.blake3_hash",
                      "=",
                      "node_file_content.blake3_hash",
                    ),
                ),
              ),
            )
            .where("blake3_hash", "in", chunk)
            .returning((eb) => [
              "blake3_hash as value",
              eb("data", "is", null).as("isBlob"),
            ])
            .execute();
          return deleteResult
            .filter(({ isBlob }) => isBlob)
            .map(({ value }) => value);
        });
        if (blobs.length > 0) {
          await dbfsPurgeUnreferencedFileData(
            this.configuration,
            this.db,
            blobs,
          );
        }
      }
      await sql<void>`VACUUM`.execute(this.db);
    }
  }
}
