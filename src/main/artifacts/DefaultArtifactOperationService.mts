import { inject, injectable } from "inversify";
import * as uuid from "uuid";

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
    @inject(DatabaseProvider) private readonly db: DatabaseProvider,
  ) {}

  createArtifactPlaceholder(
    gameId: GameId,
    version: string,
    platform: string,
  ): Promise<bigint> {
    return this.db.transaction().execute(async (trx) => {
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
        .returning("node_no")
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
        .returning("node_no")
        .executeTakeFirstOrThrow();
      return artifactRow.node_no;
    });
  }

  replaceArtifactPlaceholder(
    gameId: GameId,
    version: string,
    platform: string,
    nodeNo: bigint,
  ): Promise<void> {
    return this.db.transaction().execute(async (trx) => {
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
}
