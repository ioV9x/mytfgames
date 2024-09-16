import { inject, injectable } from "inversify";
import { Insertable, QueryExecutorProvider, sql } from "kysely";
import * as R from "remeda";
import { Temporal } from "temporal-polyfill";
import * as uuid from "uuid";

import {
  Game,
  gameCrawled,
  GameDataService as GameDataServiceContract,
  GameOrderType,
  GameSId,
} from "$ipc/main-renderer";
import { GamesApi, RemoteCategory, RemoteVersionInfo } from "$main/api";
import { RemoteReduxActionSender } from "$main/pal";
import {
  AppQueryCreator,
  DatabaseProvider,
  GameId,
  GameTagTable,
  TagTable,
  TfgamesGameId,
  WellKnownTagCategory,
} from "$node-base/database";
import { remoteProcedure } from "$pure-base/ipc";

import { GameDataService } from "./GameDataService.mjs";

@injectable()
export class DefaultGameDataService implements GameDataService {
  constructor(
    @inject(DatabaseProvider) private readonly db: DatabaseProvider,
    @inject(GamesApi) private readonly gamesApi: GamesApi,
    @inject(RemoteReduxActionSender)
    private readonly remoteRedux: RemoteReduxActionSender,
  ) {}

  @remoteProcedure(GameDataServiceContract, "retrieveOrder")
  async retrieveOrder(): Promise<Record<GameOrderType, GameSId[]>> {
    return await this.db.transaction().execute(async (trx) => {
      const partials = await Promise.all(
        Object.values(GameOrderType).map(
          async (type) =>
            [
              type,
              (await this.retrieveOrderForType(trx, type)).map((r) =>
                uuid.stringify(r.id),
              ),
            ] satisfies [GameOrderType, GameSId[]],
        ),
      );
      return Object.fromEntries(partials) as Record<GameOrderType, GameSId[]>;
    });
  }

  private async retrieveOrderForType(
    trx: AppQueryCreator,
    type: GameOrderType,
  ): Promise<{ id: Buffer }[]> {
    const ids = trx
      .selectFrom("game")
      .select(["game.game_id as id"])
      .leftJoin(
        "game_description as description",
        "description.game_id",
        "game.game_id",
      )
      .leftJoin(
        "game_official_listing as listing",
        "listing.game_id",
        "game.game_id",
      )
      .leftJoin(
        "game_official_blacklist as blacklist",
        "blacklist.game_id",
        "game.game_id",
      )
      .where("blacklist.last_crawl_datetime", "is", null);
    switch (type) {
      case GameOrderType.Id:
        return await ids.orderBy("game.game_id").execute();
      case GameOrderType.Name:
        return await ids
          .orderBy((eb) => eb.fn.coalesce("description.name", "listing.name"))
          .execute();
      case GameOrderType.LastUpdate:
        return await ids
          .orderBy((eb) =>
            eb.fn.coalesce(
              "listing.last_update_datetime",
              "description.last_change_datetime",
            ),
          )
          .execute();
    }
  }

  @remoteProcedure(GameDataServiceContract, "retrieveGamesById")
  async getGames(ids: string[]): Promise<Game[]> {
    const chunks = R.chunk(ids.map(uuid.parse) as GameId[], 512);

    const chunkResults = await this.db
      .transaction()
      .execute(
        async (trx) =>
          await Promise.all(
            chunks.map((c) =>
              trx
                .selectFrom("game")
                .leftJoin(
                  "game_official_listing as listing",
                  "listing.game_id",
                  "game.game_id",
                )
                .leftJoin(
                  "game_description as description",
                  "description.game_id",
                  "game.game_id",
                )
                .select([
                  "game.game_id as id",
                  "description.name as name",
                  "description.last_change_datetime as lastChange",
                  "description.last_played_datetime as lastPlayed",
                  "description.note as note",
                  "description.user_rating as userRating",
                  "listing.name as officialName",
                  "listing.num_likes as numLikes",
                  "listing.tfgames_game_id as tfgamesId",
                  "listing.last_update_datetime as lastUpdate",
                ])
                .where("game.game_id", "in", c)
                .execute(),
            ),
          ),
      );

    return R.pipe(
      chunkResults,
      R.flat(),
      R.map(
        ({
          id,
          lastChange,
          lastPlayed,
          lastUpdate,
          name,
          note,
          numLikes,
          officialName,
          tfgamesId,
          userRating,
        }) =>
          ({
            id: uuid.stringify(id),
            description:
              name == null
                ? null
                : {
                    name,
                    lastChangeTimestamp: lastChange!,
                    lastPlayedTimestamp: lastPlayed!,
                    userRating: userRating!,
                    note: note!,
                  },
            listing:
              tfgamesId == null
                ? null
                : {
                    tfgamesId,
                    name: officialName!,
                    numLikes: numLikes!,
                    lastUpdateTimestamp: lastUpdate!,
                  },
          }) satisfies Game,
      ),
    );
  }

  @remoteProcedure(GameDataServiceContract, "findGamesByNamePrefix")
  async findGameByNamePrefix(prefix: string): Promise<GameSId[]> {
    const games = await this.db
      .selectFrom("game")
      .leftJoin("game_description", "game_description.game_id", "game.game_id")
      .leftJoin(
        "game_official_listing",
        "game_official_listing.game_id",
        "game.game_id",
      )
      .where((eb) =>
        eb.or([
          eb("game_official_listing.name", "like", `${prefix}%`),
          eb("game_description.name", "like", `${prefix}%`),
        ]),
      )
      .select(["game.game_id"])
      .execute();
    return games.map((r) => uuid.stringify(r.game_id));
  }

  @remoteProcedure(GameDataServiceContract, "updateGameDescription")
  async updateGameDescription(
    id: GameSId,
    description: {
      name: string;
      userRating: number;
      note: string;
    },
  ): Promise<void> {
    const game_id = uuid.parse(id) as GameId;
    const last_change_datetime = Temporal.Now.instant().toString({
      smallestUnit: "second",
    });
    const game = await this.db.transaction().execute(async (trx) => {
      const updatedDescription = await trx
        .insertInto("game_description")
        .values({
          game_id,
          name: description.name,
          user_rating: description.userRating,
          note: description.note,
          last_change_datetime,
        })
        .onConflict((oc) =>
          oc.doUpdateSet({
            last_change_datetime,
            name: description.name,
            user_rating: description.userRating,
            note: description.note,
          }),
        )
        .returning([
          "name",
          "last_change_datetime as lastChangeTimestamp",
          "last_played_datetime as lastPlayedTimestamp",
          "user_rating as userRating",
          "note",
        ])
        .executeTakeFirstOrThrow();

      const listing = await trx
        .selectFrom("game_official_listing")
        .where("game_id", "=", game_id)
        .select([
          "tfgames_game_id as tfgamesId",
          "name",
          "num_likes as numLikes",
          "last_update_datetime as lastUpdateTimestamp",
        ])
        .executeTakeFirst();

      return {
        id,
        description: updatedDescription,
        listing: listing ?? null,
      };
    });
    this.remoteRedux.dispatch(gameCrawled(game));
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

    const game = await this.db.transaction().execute(async (trx) => {
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

      return {
        id: uuid.stringify(game_id),
        description: await this.getDescrpition(trx, game_id),
        listing: {
          tfgamesId: tfgamesGameId,
          name: gameDetails.name,
          numLikes: gameDetails.numLikes ?? 0,
          lastUpdateTimestamp: gameDetails.lastUpdate,
        },
      };
    });

    if (game != null) {
      this.remoteRedux.dispatch(gameCrawled(game));
    }
  }

  private async getDescrpition(
    qc: AppQueryCreator & QueryExecutorProvider,
    game_id: GameId,
  ): Promise<Game["description"] | null> {
    return (
      (await qc
        .selectFrom("game_description")
        .where("game_id", "=", game_id)
        .select([
          "name",
          "last_change_datetime as lastChangeTimestamp",
          "last_played_datetime as lastPlayedTimestamp",
          "user_rating as userRating",
          "note",
        ])
        .executeTakeFirst()) ?? null
    );
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
