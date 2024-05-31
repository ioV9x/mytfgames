import { inject, injectable } from "inversify";
import * as uuid from "uuid";

import { remoteProcedure } from "$ipc/core";
import {
  GameInfo,
  GameInfoService as GameInfoServiceContract,
} from "$ipc/main-renderer";
import { GamesApi } from "$main/api";
import { DatabaseProvider } from "$main/database";

import { GameInfoService } from "./GameInfoService.mjs";

@injectable()
export class GameInfoServiceImpl implements GameInfoService {
  constructor(
    @inject(DatabaseProvider) private readonly db: DatabaseProvider,
    @inject(GamesApi) private readonly gamesApi: GamesApi,
  ) {}

  @remoteProcedure(GameInfoServiceContract, "getGames")
  async refreshIndex(): Promise<GameInfo[]> {
    const currentIndex = await this.gamesApi.getGames();

    const state = await this.db.transaction().execute(async (trx) => {
      await Promise.all(
        currentIndex.map(({ rid, name, lastUpdate: last_update }) => {
          const id = Number.parseInt(rid!);
          return trx
            .insertInto("remote_game")
            .values({
              id,
              name,
              last_update,
            })
            .onConflict((oc) =>
              oc.column("id").doUpdateSet({
                name,
                last_update,
              }),
            )
            .executeTakeFirstOrThrow();
        }),
      );

      const unknownIds = await trx
        .selectFrom("remote_game")
        .select("id")
        .where(({ not, exists, selectFrom }) =>
          not(
            exists(
              selectFrom("game")
                .select("tfgames_id")
                .whereRef("game.tfgames_id", "=", "remote_game.id"),
            ),
          ),
        )
        .execute();

      await Promise.all(
        unknownIds.map(({ id: tfgames_id }) =>
          trx
            .insertInto("game")
            .values({
              id: uuid.v4(null, Buffer.allocUnsafe(16)),
              tfgames_id,
            })
            .executeTakeFirstOrThrow(),
        ),
      );

      return trx
        .selectFrom("game")
        .leftJoin("remote_game", "remote_game.id", "game.tfgames_id")
        .select([
          "game.id",
          "game.name",
          "game.tfgames_id",
          "remote_game.name as remote_name",
          "remote_game.last_update",
        ])
        .execute();
    });

    return state.map(({ id, last_update, tfgames_id, name, remote_name }) => ({
      id: uuid.stringify(id),
      lastUpdate: last_update ?? "1970-01-01",
      rid: tfgames_id?.toString() ?? undefined,
      name: name ?? remote_name ?? "<not-set>",
    }));
  }
}
