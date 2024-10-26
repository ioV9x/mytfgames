import { Job } from "$main/pal";
import { DatabaseProvider } from "$node-base/database";

export class DbfsNodeCleanupJob implements Job {
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
