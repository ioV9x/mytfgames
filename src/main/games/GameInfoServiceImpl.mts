import { inject, injectable } from "inversify";
import { Insertable, QueryExecutorProvider, sql } from "kysely";
import * as R from "remeda";
import { Temporal } from "temporal-polyfill";
import * as uuid from "uuid";

import { remoteProcedure } from "$ipc/core";
import {
  GameInfo,
  GameInfoService as GameInfoServiceContract,
  GameList,
  GameOrderType,
} from "$ipc/main-renderer";
import { GamesApi, RemoteCategory, RemoteVersionInfo } from "$main/api";
import {
  AppQueryCreator,
  DatabaseProvider,
  GameId,
  GameTagTable,
  TagTable,
  TfgamesGameId,
  WellKnownTagCategory,
} from "$main/database";

import { GameInfoService } from "./GameInfoService.mjs";

const refreshInterval = Temporal.Duration.from({ minutes: 15 });
const initialIndexUpdateInstant = Temporal.Instant.fromEpochSeconds(0);

@injectable()
export class GameInfoServiceImpl implements GameInfoService {
  private nextIndexUpdate: Temporal.Instant = initialIndexUpdateInstant;

  constructor(
    @inject(DatabaseProvider) private readonly db: DatabaseProvider,
    @inject(GamesApi) private readonly gamesApi: GamesApi,
  ) {}

  @remoteProcedure(GameInfoServiceContract, "getGames")
  async getGames(ids: string[]): Promise<GameInfo[]> {
    const chunks = R.chunk(ids.map(uuid.parse) as GameId[], 512);

    const chunkResults = await this.db.transaction().execute(
      async (trx) =>
        await Promise.all(
          chunks.map((c) =>
            trx
              .selectFrom("game")
              .leftJoin(
                "game_official_listing",
                "game_official_listing.game_id",
                "game.game_id",
              )
              .leftJoin(
                "game_description",
                "game_description.game_id",
                "game.game_id",
              )
              .where("game_id", "in", c)
              .select([
                "game.game_id",
                "game_official_listing.tfgames_game_id as tfgamesId",
                "game_official_listing.last_update_datetime as lastUpdate",
                (eb) =>
                  eb.fn
                    .coalesce(
                      "game_description.name",
                      "game_official_listing.name",
                      sql<string>`'<orphaned>'`,
                    )
                    .as("name"),
              ])
              .execute(),
          ),
        ),
    );

    return R.pipe(
      chunkResults,
      R.flat(),
      R.map(
        ({ game_id, lastUpdate, name, tfgamesId }) =>
          ({
            id: uuid.stringify(game_id),
            lastUpdate: lastUpdate ?? "<untracked>",
            tfgamesId: tfgamesId ?? undefined,
            name,
          }) satisfies GameInfo,
      ),
    );
  }

  @remoteProcedure(GameInfoServiceContract, "getGameList")
  async getGameList(
    order: GameOrderType,
    page: number,
    pageSize: number,
    force: boolean,
  ): Promise<GameList> {
    const now = Temporal.Now.instant();
    if (force || Temporal.Instant.compare(now, this.nextIndexUpdate) > 0) {
      this.nextIndexUpdate = now.add(refreshInterval);
      await this.refreshIndex();
    }

    const offset = (page - 1) * pageSize;
    return await this.db.transaction().execute(async (trx) => {
      const pageContent = await trx
        .selectFrom("game")
        .leftJoin(
          "game_official_listing",
          "game_official_listing.game_id",
          "game.game_id",
        )
        .leftJoin(
          "game_description",
          "game_description.game_id",
          "game.game_id",
        )
        .select([
          "game.game_id as id",
          (eb) =>
            eb.fn
              .coalesce(
                "game_description.name",
                "game_official_listing.name",
                sql<string>`'!<orphaned>'`,
              )
              .as("name"),
          "game_official_listing.tfgames_game_id as tfgames_id",
          (eb) =>
            eb.fn
              .coalesce(
                "game_official_listing.last_update_datetime",
                sql<string>`':<orphaned>'`, // bigger than any ISO 8601 string
              )
              .as("last_update"),
        ])
        .orderBy(
          order === GameOrderType.LastUpdate ? "last_update" : "name",
          order === GameOrderType.LastUpdate ? "desc" : "asc",
        )
        .limit(pageSize)
        .offset(offset)
        .execute();

      const ordering = await trx
        .selectFrom("game")
        .leftJoin(
          "game_official_listing",
          "game_official_listing.game_id",
          "game.game_id",
        )
        .leftJoin(
          "game_description",
          "game_description.game_id",
          "game.game_id",
        )
        .select("game.game_id")
        .orderBy(
          (eb) =>
            order === GameOrderType.LastUpdate
              ? eb.fn.coalesce(
                  "game_official_listing.last_update_datetime",
                  sql<string>`':<orphaned>'`, // bigger than any ISO 8601 string
                )
              : eb.fn.coalesce(
                  "game_description.name",
                  "game_official_listing.name",
                  sql<string>`'!<orphaned>'`,
                ),
          order === GameOrderType.LastUpdate ? "desc" : "asc",
        )
        .execute();

      return {
        order: ordering.map(({ game_id }) => uuid.stringify(game_id)),
        preloaded: pageContent.map(
          ({ id, tfgames_id, name, last_update }) =>
            ({
              id: uuid.stringify(id),
              lastUpdate: last_update,
              tfgamesId: tfgames_id ?? undefined,
              name: name,
            }) satisfies GameInfo,
        ),
      } satisfies GameList;
    });
  }

  async refreshIndex(): Promise<[GameId, TfgamesGameId][]> {
    const currentIndex = await this.gamesApi.getGames();

    const updated = await this.db.transaction().execute(async (trx) => {
      await Promise.all(
        currentIndex.map(async ({ id, name, numLikes, lastUpdate }) => {
          const game = await trx
            .updateTable("game_official_listing")
            .where("tfgames_game_id", "=", id)
            .set("name", name)
            .set("last_update_datetime", lastUpdate)
            .returning("game_id")
            .executeTakeFirst();
          if (game === undefined) {
            await this.insertOfficialListing(
              trx,
              null,
              id,
              name,
              numLikes,
              lastUpdate,
            );
          }
        }),
      );
      return await trx
        .selectFrom("game_official_listing_outdated_v")
        .select(["game_id", "tfgames_game_id"])
        .execute();
    });
    return updated.map(({ game_id, tfgames_game_id }) => [
      game_id,
      tfgames_game_id,
    ]);
  }

  private async insertOfficialListing(
    qc: AppQueryCreator,
    gameId: GameId | null | undefined,
    tfgames_game_id: number,
    name: string,
    num_likes: number,
    last_update_datetime: string,
  ): Promise<Buffer> {
    const game_id = gameId ?? uuid.v4(null, Buffer.allocUnsafe(16));
    if (gameId == null) {
      await qc.insertInto("game").values({ game_id }).execute();
    }
    await qc
      .insertInto("game_official_listing")
      .values({
        game_id,
        tfgames_game_id,
        name,
        num_likes,
        last_update_datetime,
      })
      .execute();
    return game_id;
  }

  async downloadGameInfo(tfgamesGameId: TfgamesGameId): Promise<void> {
    const gameDetails = await this.gamesApi.getGameDetails(tfgamesGameId);

    await this.db.transaction().execute(async (trx) => {
      const lastCrawled = Temporal.Now.instant().toString({
        smallestUnit: "second",
      });
      if (!("name" in gameDetails)) {
        const game = await trx
          .selectFrom("game_official_listing")
          .select("game_id")
          .where("tfgames_game_id", "=", tfgamesGameId)
          .executeTakeFirst();
        if (game != null) {
          await trx
            .insertInto("game_official_blacklist")
            .values({
              game_id: game.game_id,
              last_crawl_datetime: lastCrawled,
            })
            .onConflict((oc) =>
              oc.doUpdateSet({ last_crawl_datetime: lastCrawled }),
            )
            .execute();
        }
        return;
      }

      const game_id =
        (
          await trx
            .updateTable("game_official_listing")
            .where("tfgames_game_id", "=", tfgamesGameId)
            .set("name", gameDetails.name)
            .set("last_update_datetime", gameDetails.lastUpdate)
            .set("num_likes", gameDetails.numLikes ?? 0)
            .returning("game_id")
            .executeTakeFirst()
        )?.game_id ??
        (await this.insertOfficialListing(
          trx,
          null,
          tfgamesGameId,
          gameDetails.name,
          gameDetails.numLikes ?? 0,
          gameDetails.lastUpdate,
        ));

      await trx
        .deleteFrom("game_official_blacklist")
        .where("game_id", "=", game_id)
        .execute();

      await trx
        .insertInto("game_official_listing_details")
        .values({
          game_id,
          last_crawl_datetime: lastCrawled,
          release_datetime: gameDetails.releaseDate,
          synopsis: "",
        })
        .onConflict((oc) =>
          oc.column("game_id").doUpdateSet({
            last_crawl_datetime: lastCrawled,
            release_datetime: gameDetails.releaseDate,
          }),
        )
        .execute();

      await Promise.all(
        gameDetails.authors.map((author) =>
          trx
            .insertInto("tfgames_author")
            .values({
              tfgames_profile_id: author.id,
              username: author.name,
            })
            .onConflict((oc) =>
              oc.column("tfgames_profile_id").doUpdateSet({
                username: author.name,
              }),
            )
            .execute(),
        ),
      );
      await Promise.all(
        gameDetails.authors.map((author) =>
          trx
            .insertInto("game_official_tfgames_author")
            .values({
              game_id,
              tfgames_profile_id: author.id,
            })
            .onConflict((oc) =>
              oc.columns(["game_id", "tfgames_profile_id"]).doNothing(),
            )
            .execute(),
        ),
      );

      await this.mergeTags(trx, game_id, [
        [gameDetails.adultThemes, WellKnownTagCategory.Adult],
        [gameDetails.transformationThemes, WellKnownTagCategory.Transformation],
        [gameDetails.multimediaThemes, WellKnownTagCategory.Multimedia],
      ]);

      await this.mergeVersions(trx, game_id, gameDetails.versions);
    });
  }

  private async mergeTags(
    qc: AppQueryCreator & QueryExecutorProvider,
    game_id: GameId,
    categorizedTags: [RemoteCategory[], string][],
  ): Promise<void> {
    if (categorizedTags.length === 0) {
      return;
    }
    const tags = categorizedTags.flatMap(([remoteCategories, tag_category]) =>
      remoteCategories.map(
        ({ abbreviation: tag, name: tag_name }) =>
          ({
            tag_category,
            tag,
            tag_name,
          }) satisfies Insertable<TagTable>,
      ),
    );
    if (tags.length === 0) {
      return;
    }
    await qc
      .insertInto("tag")
      .values(tags)
      .onConflict((oc) => oc.doNothing())
      .execute();

    await Promise.all(
      categorizedTags.flatMap(([remoteCategories, tag_category]) =>
        remoteCategories.map(
          async ({ abbreviation: tag, id: tfgames_tag_id }) =>
            // TODO: replace with insertInto when kysely supports orReplace()
            //       https://github.com/kysely-org/kysely/issues/916
            sql`INSERT OR REPLACE INTO official_tag VALUES (${tag_category}, ${tag}, ${tfgames_tag_id})`.execute(
              qc,
            ),
        ),
      ),
    );

    const gameTags = categorizedTags.flatMap(
      ([remoteCategories, tag_category]) =>
        remoteCategories.map(
          ({ abbreviation: tag }) =>
            ({
              tag_category,
              tag,
              game_id,
            }) satisfies Insertable<GameTagTable>,
        ),
    );
    await qc
      .insertInto("game_tag")
      .values(gameTags)
      .onConflict((oc) => oc.doNothing())
      .execute();
  }

  private async mergeVersions(
    qc: AppQueryCreator,
    game_id: GameId,
    versions: RemoteVersionInfo[],
  ): Promise<void> {
    if (versions.length === 0) {
      return;
    }
    await qc
      .insertInto("game_version")
      .values(versions.map(({ version }) => ({ version, game_id })))
      .onConflict((oc) => oc.doNothing())
      .execute();

    await qc
      .deleteFrom("game_version_source")
      .where("game_id", "=", game_id)
      .where(
        "version",
        "in",
        versions.map(({ version }) => version),
      )
      .execute();

    const values = versions.flatMap(({ version, downloads }) =>
      R.uniqueBy(downloads, (d) => d.link).map(({ link, note }) => ({
        version,
        game_id,
        uri: link,
        official_note: note,
      })),
    );
    if (values.length === 0) {
      return;
    }
    await qc.insertInto("game_version_source").values(values).execute();
  }
}
