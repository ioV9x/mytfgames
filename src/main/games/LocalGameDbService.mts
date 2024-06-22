import { inject, injectable } from "inversify";
import { Transaction } from "kysely";
import * as R from "remeda";
import * as uuid from "uuid";

import { remoteProcedure } from "$ipc/core";
import {
  LocalGame,
  LocalGameDataService,
  LocalGameId,
  LocalGameOrderType,
} from "$ipc/main-renderer";
import { AppDatabase, DatabaseProvider } from "$main/database";

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
                .selectFrom("game")
                .where("game.id", "in", c)
                .select(["game.id", "game.name"])
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
      .selectFrom("game")
      .select(["id"])
      .orderBy((eb) => {
        switch (type) {
          case LocalGameOrderType.Id:
            return eb.ref("id");
          case LocalGameOrderType.Name:
            return eb.ref("name");
        }
      })
      .execute();
  }
}
