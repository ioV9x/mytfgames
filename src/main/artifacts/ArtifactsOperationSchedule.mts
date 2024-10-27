import EventEmitter from "events";
import { inject, injectable } from "inversify";
import { sql } from "kysely";
import { Temporal } from "temporal-polyfill";
import * as uuid from "uuid";

import {
  ArtifactService,
  GameSId,
  gameVersionUpdated,
} from "$ipc/main-renderer";
import { ArtifactIoService } from "$ipc/worker-main";
import { GameVersionService } from "$main/games";
import {
  Job,
  JobEmitter,
  JobEmitterEvents,
  JobSchedule,
  RemoteReduxActionSender,
} from "$main/pal";
import { AppConfiguration } from "$node-base/configuration";
import {
  DatabaseProvider,
  GameId,
  WellKnownDirectory,
} from "$node-base/database";
import { remoteProcedure } from "$pure-base/ipc";

import { ArtifactOperationService } from "./ArtifactOperationService.mjs";
import { DbfsContentCleanupJob } from "./jobs/DbfsContentCleanupJob.mjs";
import { DbfsNodeCleanupJob } from "./jobs/DbfsNodeCleanupJob.mjs";

@injectable()
export class ArtifactsOperationSchedule
  extends EventEmitter<JobEmitterEvents>
  implements JobEmitter, JobSchedule
{
  readonly scheduleName = "artifact-operations";
  readonly maxJobConcurrency = 1;
  readonly scheduleCheckInterval = Temporal.Duration.from({ minutes: 10 });
  readonly runOnStart = true;

  private startup = true;

  constructor(
    @inject(AppConfiguration) private readonly configuration: AppConfiguration,
    @inject(DatabaseProvider) private readonly db: DatabaseProvider,
    @inject(RemoteReduxActionSender)
    private readonly remoteRedux: RemoteReduxActionSender,
    @inject(ArtifactIoService)
    private readonly io: ArtifactIoService,
    @inject(GameVersionService)
    private readonly gameVersionService: GameVersionService,
    @inject(ArtifactOperationService)
    private readonly ops: ArtifactOperationService,
  ) {
    super();
  }

  checkSchedule(): Promise<Job[]> | Job[] {
    if (this.startup) {
      this.startup = false;
      return this.#reapBrokenImports();
    }

    // TODO: implement
    return [];
  }

  @remoteProcedure(ArtifactService, "startImportFromFilesystem")
  async startImportFromFilesystem(
    gameSId: GameSId,
    version: string,
    platform: string,
    path: string,
  ) {
    const gameId = uuid.parse(gameSId) as GameId;
    const tmpDirNodeNo = await this.ops.createArtifactPlaceholder(
      gameId,
      version,
      platform,
    );
    const updatedVersionInfo =
      await this.gameVersionService.retrieveVersionInfoForGame(gameId, version);
    this.remoteRedux.dispatch(gameVersionUpdated(updatedVersionInfo));
    this.emit(
      "created",
      new ArtifactImportFromFsJob(
        this.io,
        this.ops,
        this.remoteRedux,
        this.gameVersionService,
        gameId,
        version,
        platform,
        path,
        tmpDirNodeNo,
      ),
    );
  }

  @remoteProcedure(ArtifactService, "queueArtifactForDeletion")
  async queueArtifactForDeletion(
    gameSId: GameSId,
    version: string,
    platform: string,
  ) {
    const gameId = uuid.parse(gameSId) as GameId;
    const obsoleteNodeNo = await this.ops.deleteArtifact(
      gameId,
      version,
      platform,
    );
    this.emit(
      "created",
      new DbfsNodeCleanupJob(this.configuration, this.db, obsoleteNodeNo, true),
    );
  }

  async #reapBrokenImports(): Promise<Job[]> {
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
        ({ node_no }) =>
          new DbfsNodeCleanupJob(this.configuration, this.db, node_no),
      ),
      new DbfsContentCleanupJob(this.configuration, this.db),
    ];
  }
}

class ArtifactImportFromFsJob implements Job {
  readonly id: string;

  constructor(
    private readonly io: ArtifactIoService,
    private readonly ops: ArtifactOperationService,
    private readonly rras: RemoteReduxActionSender,
    private readonly gameVersionService: GameVersionService,
    private readonly gameId: GameId,
    private readonly version: string,
    private readonly platform: string,
    private readonly path: string,
    private readonly tmpDirNodeNo: bigint,
  ) {
    this.id = `import-from-fs:${uuid.stringify(gameId)}-${version}-${platform}`;
  }

  async run(_signal: AbortSignal) {
    await this.io.importFromFsNode(this.path, this.tmpDirNodeNo);
    await this.ops.replaceArtifactPlaceholder(
      this.gameId,
      this.version,
      this.platform,
      this.tmpDirNodeNo,
    );

    const version = await this.gameVersionService.retrieveVersionInfoForGame(
      this.gameId,
      this.version,
    );
    this.rras.dispatch(gameVersionUpdated(version));
  }
}
