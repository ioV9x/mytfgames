import { inject, injectable } from "inversify";
import { Transaction } from "kysely";
import * as R from "remeda";
import * as uuid from "uuid";

import { remoteProcedure } from "$ipc/core";
import {
  LocalGame,
  LocalGameCreationInfo,
  LocalGameDataService,
  LocalGameId,
  LocalGameOrderType,
} from "$ipc/main-renderer";
import { AppDatabase, DatabaseProvider, GameId } from "$main/database";

@injectable()
export class LocalGameDbService {
  constructor(
    @inject(DatabaseProvider) private readonly db: DatabaseProvider,
  ) {}

  @remoteProcedure(LocalGameDataService, "retrieveOrder")
  async retrieveOrder(): Promise<Record<LocalGameOrderType, LocalGameId[]>> {
    return await this.db.transaction().execute(async (trx) => {
      const partials = await Promise.all(
        Object.values(LocalGameOrderType).map(
          async (type) =>
            [
              type,
              (await this.retrieveOrderForType(trx, type)).map((r) =>
                uuid.stringify(r.id),
              ),
            ] satisfies [LocalGameOrderType, LocalGameId[]],
        ),
      );
      return Object.fromEntries(partials) as Record<
        LocalGameOrderType,
        LocalGameId[]
      >;
    });
  }

  @remoteProcedure(LocalGameDataService, "retrieveGamesById")
  async retrieveGamesById(ids: LocalGameId[]): Promise<LocalGame[]> {
    const chunks = R.chunk(ids.map(uuid.parse) as Buffer[], 512);

    const chunkResults = await this.db
      .transaction()
      .execute(
        async (trx) =>
          await Promise.all(
            chunks.map((c) =>
              trx
                .selectFrom("game_description")
                .where("game_id", "in", c)
                .select(["game_id as id", "name"])
                .execute(),
            ),
          ),
      );

    return chunkResults.flat().map((game) => ({
      id: uuid.stringify(game.id),
      name: game.name,
    }));
  }

  private retrieveOrderForType(
    trx: Transaction<AppDatabase>,
    type: LocalGameOrderType,
  ): Promise<{ id: Buffer }[]> {
    return trx
      .selectFrom("game_description")
      .select(["game_id as id"])
      .orderBy((eb) => {
        switch (type) {
          case LocalGameOrderType.Id:
            return eb.ref("game_id");
          case LocalGameOrderType.Name:
            return eb.ref("name");
        }
      })
      .execute();
  }

  @remoteProcedure(LocalGameDataService, "addGame")
  async addGame(game: LocalGameCreationInfo): Promise<LocalGameId> {
    return await this.db.transaction().execute(async (trx) => {
      let game_id: GameId;
      if (game.remoteGameId == null) {
        game_id = uuid.v4(null, Buffer.allocUnsafe(16));
        await trx.insertInto("game").values({ game_id }).execute();
      } else {
        game_id = (
          await trx
            .selectFrom("game_official_listing")
            .select("game_id")
            .where("tfgames_game_id", "=", game.remoteGameId)
            .executeTakeFirstOrThrow()
        ).game_id;
      }
      await trx
        .insertInto("game_description")
        .values({
          game_id,
          name: game.name,
        })
        .execute();
      return uuid.stringify(game_id);
    });
  }
}
