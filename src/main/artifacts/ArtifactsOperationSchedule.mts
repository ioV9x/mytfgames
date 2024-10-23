import EventEmitter from "events";
import { inject, injectable } from "inversify";
import * as uuid from "uuid";

import {
  ArtifactService,
  gameArtifactImported,
  GameSId,
} from "$ipc/main-renderer";
import { ArtifactIoService } from "$ipc/worker-main";
import { GameVersionService } from "$main/games";
import {
  Job,
  JobEmitter,
  JobEmitterEvents,
  RemoteReduxActionSender,
} from "$main/pal";
import { GameId } from "$node-base/database";
import { remoteProcedure } from "$pure-base/ipc";

import { ArtifactOperationService } from "./ArtifactOperationService.mjs";

@injectable()
export class ArtifactsOperationSchedule
  extends EventEmitter<JobEmitterEvents>
  implements JobEmitter
{
  readonly scheduleName = "artifact-operations";
  readonly maxJobConcurrency = 1;

  constructor(
    @inject(ArtifactOperationService)
    private readonly ops: ArtifactOperationService,
    @inject(ArtifactIoService)
    private readonly io: ArtifactIoService,
    @inject(RemoteReduxActionSender)
    private readonly remoteRedux: RemoteReduxActionSender,
    @inject(GameVersionService)
    private readonly gameVersionService: GameVersionService,
  ) {
    super();
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

    this.rras.dispatch(gameArtifactImported(version));
  }
}
