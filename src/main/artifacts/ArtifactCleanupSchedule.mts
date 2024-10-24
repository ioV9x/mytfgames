import { Dirent } from "node:fs";
import { readdir, unlink } from "node:fs/promises";
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

const blobSubDirPattern = /^[0-9a-fA-F]{3}$/;
const blobNamePattern = /^[0-9a-fA-F]{64}$/;
function isBlobSubDir(ent: Dirent): boolean {
  return ent.isDirectory() && blobSubDirPattern.test(ent.name);
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
    console.timeEnd(`DbfsContentCleanupJob`);
  }

  async #purgeUnreferencedBlobs(blobEnts: { path: string; hash: Buffer }[]) {
    await this.db.transaction().execute(async (trx) => {
      await sql<void>`COMMIT TRANSACTION`.execute(trx);
      await sql<void>`BEGIN IMMEDIATE TRANSACTION`.execute(trx);

      const knownExternalEntries = await trx
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
    });
  }
}

function sortedDifferenceBy<T1, T2, TV extends NonNullable<unknown>>(
  data: T1[],
  exclude: T2[],
  toValue: (x: T1 | T2) => TV,
  compare: (a: TV, b: TV) => number,
): T1[] {
  if (data.length === 0) {
    return [];
  }
  if (exclude.length === 0) {
    return [...data];
  }
  let i = 0;
  let iv = toValue(data[i]!);
  let j = 0;
  let jv = toValue(exclude[j]!);
  const result: T1[] = [];
  for (;;) {
    const cmp = compare(iv, jv);
    if (cmp < 0) {
      result.push(data[i++]!);
      if (i === data.length) {
        break;
      }
      iv = toValue(data[i]!);
    } else if (cmp === 0) {
      if (++i === data.length || ++j === exclude.length) {
        break;
      }
      iv = toValue(data[i]!);
      jv = toValue(exclude[j]!);
    } else {
      if (++j === exclude.length) {
        break;
      }
      jv = toValue(exclude[j]!);
    }
  }
  for (; i < data.length; i++) {
    result.push(data[i]!);
  }
  return result;
}
