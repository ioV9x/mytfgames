import { unlink } from "node:fs/promises";
import path from "node:path";

import { inject, injectable } from "inversify";
import { sql } from "kysely";
import * as R from "remeda";
import { Temporal } from "temporal-polyfill";

import { Job, JobSchedule } from "$main/pal";
import { AppConfiguration } from "$node-base/configuration";
import { DatabaseProvider, WellKnownDirectory } from "$node-base/database";
import { isErrnoException } from "$node-base/utils";

@injectable()
export class ArtifactCleanupSchedule implements JobSchedule {
  readonly scheduleName = "artifacts-cleanup";
  readonly scheduleCheckInterval = Temporal.Duration.from({ minutes: 10 });
  readonly runOnStart = true;
  readonly maxJobConcurrency = 1;

  private startup = true;

  constructor(
    @inject(AppConfiguration) private readonly configuration: AppConfiguration,
    @inject(DatabaseProvider) private readonly db: DatabaseProvider,
  ) {}

  checkSchedule(): Promise<Job[]> | Job[] {
    if (this.startup) {
      this.startup = false;
      return this.reapBrokenImports();
    }

    // TODO: implement
    return [];
  }

  async reapBrokenImports(): Promise<Job[]> {
    await this.db.transaction().execute(async (trx) => {
      await trx
        .updateTable("node_member")
        .set({
          name: sql<string>`hex(randomblob(8)) || '-' || "node_member"."name"`,
          node_no_parent: WellKnownDirectory.CLEANUP_QUEUE,
        })
        .from("game_version_artifact")
        .whereRef("node_member.node_no", "=", "game_version_artifact.node_no")
        .where("node_member.node_no_parent", "=", WellKnownDirectory.TMP_IMPORT)
        .execute();

      await trx
        .deleteFrom("game_version_artifact")
        .where((eb) =>
          eb.exists(
            eb
              .selectFrom("node_member")
              .select("node_member.node_no")
              .whereRef(
                "node_member.node_no",
                "=",
                "game_version_artifact.node_no",
              )
              .where(
                "node_member.node_no_parent",
                "=",
                WellKnownDirectory.CLEANUP_QUEUE,
              ),
          ),
        )
        .execute();
    });

    const cleanupNodeNos = await this.db
      .selectFrom("node_member")
      .select("node_no")
      .where("node_no_parent", "=", WellKnownDirectory.CLEANUP_QUEUE)
      .execute();

    return [
      ...cleanupNodeNos.map(
        ({ node_no }) => new DbfsNodeCleanupJob(this.db, node_no),
      ),
      new DbfsContentCleanupJob(this.configuration, this.db),
    ];
  }
}

class DbfsNodeCleanupJob implements Job {
  readonly id: string;

  constructor(
    private readonly db: DatabaseProvider,
    private readonly nodeNo: bigint,
  ) {
    this.id = `dbfs-node-cleanup-${nodeNo}`;
  }

  async run(): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
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

      await Promise.all([
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
    });
  }
}

class DbfsContentCleanupJob implements Job {
  readonly id: string;

  constructor(
    @inject(AppConfiguration) private readonly configuration: AppConfiguration,
    private readonly db: DatabaseProvider,
  ) {
    this.id = `dbfs-content-cleanup`;
  }

  async run(): Promise<void> {
    console.time(`DbfsContentCleanupJob`);
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
        .returning("blake3_hash")
        .execute();

      for (const resultChunk of R.chunk(result, 32)) {
        await Promise.allSettled(
          resultChunk.map(async ({ blake3_hash }) => {
            const hexHash = blake3_hash.toString("hex");
            const d1 = hexHash.slice(0, 3);
            const d2 = hexHash.slice(3, 6);
            const contentPath = path.join(
              this.configuration.root.paths.blob_store,
              `${d1}/${d2}/${hexHash}`,
            );
            try {
              await unlink(contentPath);
            } catch (error) {
              if (!isErrnoException(error) || error.code !== "ENOENT") {
                throw error;
              }
            }
          }),
        );
      }

      return result.length;
    });
    if (numDeleted > 0) {
      await sql<void>`VACUUM`.execute(this.db);
    }
    console.timeEnd(`DbfsContentCleanupJob`);
  }
}
