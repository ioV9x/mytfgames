import { inject, injectable } from "inversify";
import { Temporal } from "temporal-polyfill";
import * as uuid from "uuid";

import { BundledGameMetadata, GameInfoLoader } from "$game-info/loader";
import { Game, gameCrawled, GameSId, ImportService } from "$ipc/main-renderer";
import { DatabaseProvider } from "$node-base/database";
import { RemoteReduxActionSender } from "$node-base/ipc";
import { remoteProcedure } from "$pure-base/ipc";

@injectable()
export class DefaultGameInfoImporter {
  constructor(
    @inject(DatabaseProvider) private readonly db: DatabaseProvider,
    @inject(RemoteReduxActionSender)
    private readonly remoteRedux: RemoteReduxActionSender,
    @inject(GameInfoLoader) private readonly gameInfoLoader: GameInfoLoader,
  ) {}

  @remoteProcedure(ImportService, "importGameInfoFromFolder")
  async importGameInfoFromFolder(artifactFolder: string): Promise<GameSId> {
    let metadata: BundledGameMetadata;
    try {
      metadata =
        await this.gameInfoLoader.loadGameInfoFromMetaFolder(artifactFolder);
    } catch (error) {
      throw new Error(`Failed to load game info from folder`, { cause: error });
    }
    const game = await this.db.transaction().execute(async (trx) => {
      await trx
        .insertInto("game")
        .values({
          game_id: metadata.gameInfo.ids.uuid,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();

      const updatedMetadata = await trx
        .insertInto("game_metadata")
        .values({
          game_id: metadata.gameInfo.ids.uuid,
          name: metadata.gameInfo.name,
          synopsis: metadata.gameInfo.synopsis,
          full_description: metadata.gameInfo.description,
          last_update_datetime: Temporal.Now.instant().toString({
            smallestUnit: "second",
          }),
          metadata_timestamp: metadata.gameInfo.metadataTimestamp,
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
              metadata_timestamp: eb.ref("excluded.metadata_timestamp"),
              tfgames_site_game_id: eb.ref("excluded.tfgames_site_game_id"),
            }))
            .whereRef(
              "excluded.metadata_timestamp",
              "<",
              "game_metadata.metadata_timestamp",
            ),
        )
        .returning([
          "name as name",
          "last_update_datetime as lastUpdateTimestamp",
          "synopsis as synopsis",
          "full_description as fullDescription",
        ])
        .executeTakeFirst();

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

      const userNotes = await trx
        .selectFrom("game_user_notes")
        .where("game_id", "=", metadata.gameInfo.ids.uuid)
        .select([
          "custom_name",
          "last_played_datetime",
          "last_change_datetime",
          "user_rating",
          "note",
        ])
        .executeTakeFirst();
      const listing = await trx
        .selectFrom("game_official_listing")
        .where("game_id", "=", metadata.gameInfo.ids.uuid)
        .select([
          "tfgames_game_id as tfgamesId",
          "name",
          "num_likes as numLikes",
          "last_update_datetime as lastUpdateTimestamp",
        ])
        .executeTakeFirst();

      return {
        id: uuid.stringify(metadata.gameInfo.ids.uuid),
        userNotes: userNotes
          ? {
              name: userNotes.custom_name,
              lastChangeTimestamp: userNotes.last_change_datetime,
              lastPlayedTimestamp: userNotes.last_played_datetime,
              userRating: userNotes.user_rating,
              note: userNotes.note,
            }
          : null,
        metadata: updatedMetadata ?? null,
        listing: listing ?? null,
      } satisfies Game;
    });
    this.remoteRedux.dispatch(gameCrawled(game));
    return game.id;
  }
}
