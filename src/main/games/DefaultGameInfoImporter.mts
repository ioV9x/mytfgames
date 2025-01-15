import { inject, injectable } from "inversify";
import { Temporal } from "temporal-polyfill";
import * as uuid from "uuid";

import { BundledGameMetadata, GameInfoLoader } from "$game-info/loader";
import { GameSId } from "$ipc/main-renderer";
import { DatabaseProvider } from "$node-base/database";

@injectable()
export class DefaultGameInfoImporter {
  constructor(
    @inject(DatabaseProvider) private readonly db: DatabaseProvider,
    @inject(GameInfoLoader) private readonly gameInfoLoader: GameInfoLoader,
  ) {}

  async importGameInfoFromFolder(artifactFolder: string): Promise<GameSId> {
    let metadata: BundledGameMetadata;
    try {
      metadata =
        await this.gameInfoLoader.loadGameInfoFromMetaFolder(artifactFolder);
    } catch (error) {
      throw new Error(`Failed to load game info from folder`, { cause: error });
    }
    await this.db.transaction().execute(async (trx) => {
      await trx
        .insertInto("game")
        .values({
          game_id: metadata.gameInfo.ids.uuid,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();

      await trx
        .insertInto("game_metadata")
        .values({
          game_id: metadata.gameInfo.ids.uuid,
          name: metadata.gameInfo.name,
          synopsis: metadata.gameInfo.synopsis,
          full_description: metadata.gameInfo.description,
          last_update_datetime: Temporal.Now.instant().toString({
            smallestUnit: "second",
          }),
          metadata_version: metadata.gameInfo.metadataVersion,
          tfgames_site_game_id: metadata.gameInfo.ids.tfgamesSiteGameId,
        })
        .onConflict((oc) =>
          oc
            .doUpdateSet((eb) => ({
              game_id: eb.ref("excluded.game_id"),
              name: eb.ref("excluded.name"),
              synopsis: eb.ref("excluded.synopsis"),
              full_description: eb.ref("excluded.full_description"),
              last_update_datetime: eb.ref("excluded.last_update_datetime"),
              metadata_version: eb.ref("excluded.metadata_version"),
              tfgames_site_game_id: eb.ref("excluded.tfgames_site_game_id"),
            }))
            .whereRef(
              "excluded.metadata_version",
              "<",
              "game_metadata.metadata_version",
            ),
        )
        .execute();

      await Promise.all(
        metadata.versionInfo.map((version) => {
          return trx
            .insertInto("game_version")
            .values({
              game_id: metadata.gameInfo.ids.uuid,
              version: version.version,
              note: version.note,
            })
            .onConflict((oc) =>
              oc
                .doUpdateSet({ note: version.note })
                .where("game_version.note", "=", ""),
            )
            .execute();
        }),
      );
    });
    return uuid.stringify(metadata.gameInfo.ids.uuid);
  }
}
