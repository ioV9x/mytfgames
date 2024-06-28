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
                .selectFrom("remote_game")
                .where("remote_game.id", "in", c)
                .select([
                  "remote_game.id",
                  "remote_game.name",
                  "remote_game.last_update as lastUpdateTimestamp",
                  "remote_game.last_crawled as lastCrawlTimestamp",
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
      .selectFrom("remote_game")
      .where("remote_game.name", "like", `${prefix}%`)
      .select(["remote_game.id"])
      .execute();
  return games.map((r) => r.id);
  }

  private retrieveOrderForType(
    trx: Transaction<AppDatabase>,
    type: RemoteGameOrderType,
  ): Promise<{ id: RemoteGameId }[]> {
    return trx
      .selectFrom("remote_game")
      .select(["id"])
      .orderBy((eb) => {
        switch (type) {
          case RemoteGameOrderType.Id:
            return eb.ref("id");
          case RemoteGameOrderType.Name:
            return eb.ref("name");
          case RemoteGameOrderType.LastUpdate:
            return eb.ref("last_update");
          case RemoteGameOrderType.LastCrawled:
            return eb.ref("last_crawled");
        }
      })
      .execute();
  }
}
