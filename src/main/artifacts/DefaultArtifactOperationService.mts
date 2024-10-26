import { inject, injectable } from "inversify";
import * as uuid from "uuid";

import { gameArtifactImported } from "$ipc/main-renderer";
import { GameVersionService } from "$main/games";
import { RemoteReduxActionSender } from "$main/pal";
import {
  DatabaseProvider,
  GameId,
  WellKnownDirectory,
} from "$node-base/database";
import { dbfsMakeDirectoryNode } from "$node-base/database-fs";

import { ArtifactOperationService } from "./ArtifactOperationService.mjs";

@injectable()
export class DefaultArtifactOperationService
  implements ArtifactOperationService
{
  constructor(
    @inject(RemoteReduxActionSender)
    private readonly remoteRedux: RemoteReduxActionSender,
    @inject(DatabaseProvider) private readonly db: DatabaseProvider,
    @inject(GameVersionService)
    private readonly gameVersionService: GameVersionService,
  ) {}

  async createArtifactPlaceholder(
    gameId: GameId,
    version: string,
    platform: string,
  ): Promise<bigint> {
    return await this.db.transaction().execute(async (trx) => {
      const placeholderName = `${uuid.stringify(gameId)}-${version}-${platform}`;
      await trx
        .insertInto("game_version")
        .values({
          game_id: gameId,
          version,
        })
        .onConflict((oc) => oc.columns(["game_id", "version"]).doNothing())
        .execute();

      const { node_no: rootNodeNo } = await trx
        .insertInto("node")
        .values({ node_type: "D" })
        .returning("node_no as node_no")
        .executeTakeFirstOrThrow();
      await trx
        .insertInto("node_directory")
        .values({ directory_no: rootNodeNo })
        .execute();
      await trx
        .insertInto("node_member")
        .values({
          node_no: rootNodeNo,
          name: placeholderName,
          node_no_parent: WellKnownDirectory.TMP_IMPORT,
        })
        .execute();

      const artifactRow = await trx
        .insertInto("game_version_artifact")
        .values({
          game_id: gameId,
          version,
          platform_type: platform,
          node_no: rootNodeNo,
        })
        .returning("node_no as node_no")
        .executeTakeFirstOrThrow();
      return artifactRow.node_no;
    });
  }

  async replaceArtifactPlaceholder(
    gameId: GameId,
    version: string,
    platform: string,
    nodeNo: bigint,
  ): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      const versionDirNodeNo = await dbfsMakeDirectoryNode(
        trx,
        WellKnownDirectory.ARTIFACTS,
        `${uuid.stringify(gameId)}/${version}`,
        { recursive: true },
      );
      await trx
        .updateTable("node_member")
        .set({
          name: platform,
          node_no_parent: versionDirNodeNo,
        })
        .where("node_no", "=", nodeNo)
        .execute();
    });
  }

  async deleteArtifact(
    gameId: GameId,
    version: string,
    platform: string,
  ): Promise<bigint> {
    const nodeNo = await this.db.transaction().execute(async (trx) => {
      const { node_no } = await trx
        .deleteFrom("game_version_artifact")
        .where("game_id", "=", gameId)
        .where("version", "=", version)
        .where("platform_type", "=", platform)
        .returning("node_no as node_no")
        .executeTakeFirstOrThrow();

      await trx
        .updateTable("node_member")
        .where("node_no", "=", node_no)
        .set({
          node_no_parent: WellKnownDirectory.CLEANUP_QUEUE,
        })
        .execute();

      return node_no;
    });

    // TODO: This should probably be part of the above transaction
    const versionInfo =
      await this.gameVersionService.retrieveVersionInfoForGame(gameId, version);
    this.remoteRedux.dispatch(gameArtifactImported(versionInfo));
    return nodeNo;
  }
}
