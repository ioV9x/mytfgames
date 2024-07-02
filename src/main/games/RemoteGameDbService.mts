import { inject, injectable } from "inversify";
import { Transaction } from "kysely";
import * as R from "remeda";

import { remoteProcedure } from "$ipc/core";
import {
  RemoteGame,
  RemoteGameDataService,
  RemoteGameId,
  RemoteGameOrderType,
} from "$ipc/main-renderer";
import { AppDatabase, DatabaseProvider } from "$main/database";

@injectable()
export class RemoteGameDbService {
  constructor(
    @inject(DatabaseProvider) private readonly db: DatabaseProvider,
  ) {}

  @remoteProcedure(RemoteGameDataService, "retrieveOrder")
  async retrieveOrder(): Promise<Record<RemoteGameOrderType, RemoteGameId[]>> {
    return await this.db.transaction().execute(async (trx) => {
      const partials = await Promise.all(
        Object.values(RemoteGameOrderType).map(async (type) => ({
          [type]: (await this.retrieveOrderForType(trx, type)).map((r) => r.id),
        })),
      );
      return Object.assign({}, ...partials) as Record<
        RemoteGameOrderType,
        RemoteGameId[]
      >;
    });
  }

  @remoteProcedure(RemoteGameDataService, "retrieveGamesById")
  async retrieveGamesById(ids: RemoteGameId[]): Promise<RemoteGame[]> {
    const chunks = R.chunk(ids, 512);

    const chunkResults = await this.db
      .transaction()
      .execute(
        async (trx) =>
          await Promise.all(
            chunks.map((c) =>
              trx
                .selectFrom("game_official_listing")
                .leftJoin(
                  "game_official_listing_details",
                  "game_official_listing_details.game_id",
                  "game_official_listing.game_id",
                )
                .where("game_official_listing.tfgames_game_id", "in", c)
                .select([
                  "game_official_listing.tfgames_game_id as id",
                  "game_official_listing.name",
                  "game_official_listing.last_update_datetime as lastUpdateTimestamp",
                  "game_official_listing_details.last_crawl_datetime as lastCrawlTimestamp",
                ])
                .execute(),
            ),
          ),
      );

    return chunkResults.flat();
  }

  @remoteProcedure(RemoteGameDataService, "findGamesByNamePrefix")
  async findGameByNamePrefix(prefix: string): Promise<RemoteGameId[]> {
    const games = await this.db
      .selectFrom("game_official_listing")
      .where("game_official_listing.name", "like", `${prefix}%`)
      .select(["game_official_listing.tfgames_game_id"])
      .execute();
    return games.map((r) => r.tfgames_game_id);
  }

  private retrieveOrderForType(
    trx: Transaction<AppDatabase>,
    type: RemoteGameOrderType,
  ): Promise<{ id: RemoteGameId }[]> {
    return trx
      .selectFrom("game_official_listing")
      .leftJoin(
        "game_official_listing_details as details",
        "details.game_id",
        "game_official_listing.game_id",
      )
      .leftJoin(
        "game_official_blacklist as blacklist",
        "blacklist.game_id",
        "game_official_listing.game_id",
      )
      .select(["tfgames_game_id as id"])
      .where("blacklist.game_id", "is", null)
      .orderBy((eb) => {
        switch (type) {
          case RemoteGameOrderType.Id:
            return eb.ref("tfgames_game_id");
          case RemoteGameOrderType.Name:
            return eb.ref("name");
          case RemoteGameOrderType.LastUpdate:
            return eb.ref("last_update_datetime");
          case RemoteGameOrderType.LastCrawled:
            return eb.ref("details.last_crawl_datetime");
        }
      })
      .execute();
  }
}
