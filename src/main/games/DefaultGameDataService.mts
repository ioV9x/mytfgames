import { inject, injectable } from "inversify";
import { sql } from "kysely";
import * as R from "remeda";
import { Temporal } from "temporal-polyfill";
import * as uuid from "uuid";

import {
  Game,
  gameCrawled,
  GameDataService as GameDataServiceContract,
  GameOrderType,
  GameSearchParams,
  GameSearchResult,
  GameSId,
} from "$ipc/main-renderer";
import { RemoteReduxActionSender } from "$main/pal";
import { AppQueryCreator, DatabaseProvider, GameId } from "$node-base/database";
import { remoteProcedure } from "$pure-base/ipc";
import { SortDirection, ToKyselySortDirection } from "$pure-base/utils";

import { GameDataService } from "./GameDataService.mjs";

@injectable()
export class DefaultGameDataService implements GameDataService {
  constructor(
    @inject(DatabaseProvider) private readonly db: DatabaseProvider,
    @inject(RemoteReduxActionSender)
    private readonly remoteRedux: RemoteReduxActionSender,
  ) {}

  @remoteProcedure(GameDataServiceContract, "createCustomGame")
  async createCustomGame(description: {
    name: string;
    userRating?: number;
    note: string;
  }): Promise<GameSId> {
    const game_id: GameId = uuid.v4(undefined, Buffer.allocUnsafe(16));
    const last_change_datetime = Temporal.Now.instant().toString({
      smallestUnit: "second",
    });
    await this.db.transaction().execute(async (trx) => {
      await trx.insertInto("game").values({ game_id }).execute();

      await trx
        .insertInto("game_user_notes")
        .values({
          game_id,
          custom_name: description.name,
          user_rating: description.userRating,
          note: description.note,
          last_change_datetime,
        })
        .returning("game_id")
        .execute();
    });
    return uuid.stringify(game_id);
  }

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
        "game_user_notes as user_notes",
        "user_notes.game_id",
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
          .orderBy((eb) =>
            eb.fn.coalesce("user_notes.custom_name", "listing.name"),
          )
          .execute();
      case GameOrderType.LastUpdate:
        return await ids
          .orderBy((eb) =>
            eb.fn.coalesce(
              "listing.last_update_datetime",
              "user_notes.last_change_datetime",
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
                  "game_metadata as metadata",
                  "metadata.game_id",
                  "game.game_id",
                )
                .leftJoin(
                  "game_official_listing as listing",
                  "listing.game_id",
                  "game.game_id",
                )
                .leftJoin(
                  "game_user_notes as user_notes",
                  "user_notes.game_id",
                  "game.game_id",
                )
                .select([
                  "game.game_id as id",
                  "user_notes.custom_name as name",
                  "user_notes.last_change_datetime as lastChange",
                  "user_notes.last_played_datetime as lastPlayed",
                  "user_notes.note as note",
                  "user_notes.user_rating as userRating",
                  "metadata.name as metadataName",
                  "metadata.synopsis as synopsis",
                  "metadata.full_description as fullDescription",
                  "metadata.last_update_datetime as metadataLastUpdate",
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
          fullDescription,
          id,
          lastChange,
          lastPlayed,
          lastUpdate,
          metadataLastUpdate,
          metadataName,
          name,
          note,
          numLikes,
          officialName,
          synopsis,
          tfgamesId,
          userRating,
        }) =>
          ({
            id: uuid.stringify(id),
            userNotes:
              name == null
                ? null
                : {
                    name,
                    lastChangeTimestamp: lastChange!,
                    lastPlayedTimestamp: lastPlayed!,
                    userRating: userRating!,
                    note: note!,
                  },
            metadata:
              metadataName == null
                ? null
                : {
                    name: metadataName,
                    synopsis: synopsis!,
                    fullDescription: fullDescription!,
                    lastUpdateTimestamp: metadataLastUpdate!,
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

  @remoteProcedure(GameDataServiceContract, "findGames")
  async findGames(searchParams: GameSearchParams): Promise<GameSearchResult> {
    const { name, orderType, orderDirection, page } = searchParams;

    const games = await this.#findGamesBaseQuery(
      this.db,
      orderType,
      orderDirection,
    )
      .$if(name != null, (qb) => {
        const prefix = `${name}%`;
        return qb.where((eb) =>
          eb.or([
            eb("listing.name", "like", prefix),
            eb("user_notes.custom_name", "like", prefix),
          ]),
        );
      })
      .$if(page != null, (qb) =>
        qb
          .select((eb) => eb.fn.countAll<number>().over().as("total"))
          .limit(page!.size)
          .offset((page!.no - 1) * page!.size),
      )
      .execute();

    return {
      selected: games.map((r) => uuid.stringify(r.id)),
      total: games[0]?.total ?? games.length,
    };
  }
  #findGamesBaseQuery(
    qc: AppQueryCreator,
    orderType: GameOrderType,
    orderDirection: SortDirection,
  ) {
    const kyselyDirection = ToKyselySortDirection[orderDirection];
    return qc
      .selectFrom("game")
      .select("game.game_id as id")
      .leftJoin(
        "game_official_listing as listing",
        "listing.game_id",
        "game.game_id",
      )
      .leftJoin(
        "game_user_notes as user_notes",
        "user_notes.game_id",
        "game.game_id",
      )
      .where((eb) =>
        eb.not(
          eb.exists(
            eb
              .selectFrom("game_official_blacklist as blacklist")
              .select(sql`1`.as("x"))
              .whereRef("blacklist.game_id", "=", "game.game_id"),
          ),
        ),
      )
      .orderBy((eb) => {
        switch (orderType) {
          case GameOrderType.Id:
            return eb.ref("game.game_id");
          case GameOrderType.Name:
            return eb.fn.coalesce("user_notes.custom_name", "listing.name");
          case GameOrderType.LastUpdate:
            return eb.fn.coalesce(
              "listing.last_update_datetime",
              "user_notes.last_change_datetime",
            );
        }
      }, kyselyDirection);
  }

  @remoteProcedure(GameDataServiceContract, "findGamesByNamePrefix")
  async findGameByNamePrefix(prefix: string): Promise<GameSId[]> {
    const games = await this.db
      .selectFrom("game")
      .leftJoin("game_user_notes", "game_user_notes.game_id", "game.game_id")
      .leftJoin(
        "game_official_listing",
        "game_official_listing.game_id",
        "game.game_id",
      )
      .where((eb) =>
        eb.or([
          eb("game_official_listing.name", "like", `${prefix}%`),
          eb("game_user_notes.custom_name", "like", `${prefix}%`),
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
      const updatedUserNotes = await trx
        .insertInto("game_user_notes")
        .values({
          game_id,
          custom_name: description.name,
          user_rating: description.userRating,
          note: description.note,
          last_change_datetime,
        })
        .onConflict((oc) =>
          oc.doUpdateSet({
            last_change_datetime,
            custom_name: description.name,
            user_rating: description.userRating,
            note: description.note,
          }),
        )
        .returning([
          "custom_name as name",
          "last_change_datetime as lastChangeTimestamp",
          "last_played_datetime as lastPlayedTimestamp",
          "user_rating as userRating",
          "note as note",
        ])
        .executeTakeFirstOrThrow();

      const metadata = await trx
        .selectFrom("game_metadata")
        .where("game_id", "=", game_id)
        .select([
          "name as name",
          "last_update_datetime as lastUpdateTimestamp",
          "synopsis as synopsis",
          "full_description as fullDescription",
        ])
        .executeTakeFirst();

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
        userNotes: updatedUserNotes,
        metadata: metadata ?? null,
        listing: listing ?? null,
      };
    });
    this.remoteRedux.dispatch(gameCrawled(game));
  }
}
