import { inject, injectable } from "inversify";
import { sql } from "kysely";
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
import { GamesApi } from "$main/api";
import { DatabaseProvider } from "$main/database";

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
                .leftJoin("remote_game", "remote_game.id", "game.tfgames_id")
                .select([
                  "game.id",
                  "game.name",
                  "game.tfgames_id",
                  "game.created_at",
                  "remote_game.name as remote_name",
                  "remote_game.last_update",
                ])
                .execute(),
            ),
          ),
      );

    return R.pipe(
      chunkResults,
      R.flat(),
      R.map(
        ({ id, tfgames_id, name, created_at, remote_name, last_update }) =>
          ({
            id: uuid.stringify(id),
            lastUpdate: last_update ?? created_at,
            tfgamesId: tfgames_id ?? undefined,
            name: name ?? remote_name ?? "<not-set-db-invariant-broken>",
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
        .leftJoin("remote_game", "remote_game.id", "game.tfgames_id")
        .select([
          "game.id",
          (eb) =>
            eb.fn
              .coalesce(
                "game.name",
                "remote_game.name",
                sql<string>`'<not-set-db-invariant-broken>'`,
              )
              .as("name"),
          "game.tfgames_id",
          (eb) =>
            eb.fn
              .coalesce("remote_game.last_update", "game.created_at")
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
        .select("id")
        .orderBy(
          (eb) =>
            order === GameOrderType.LastUpdate
              ? eb.fn.coalesce(
                  eb
                    .selectFrom("remote_game")
                    .select("last_update")
                    .whereRef("remote_game.id", "=", "game.tfgames_id"),
                  "game.created_at",
                )
              : eb.fn.coalesce(
                  eb
                    .selectFrom("remote_game")
                    .select("name")
                    .whereRef("remote_game.id", "=", "game.tfgames_id"),
                  "game.name",
                ),
          order === GameOrderType.LastUpdate ? "desc" : "asc",
        )
        .execute();

      return {
        order: ordering.map(({ id }) => uuid.stringify(id)),
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

  async refreshIndex(): Promise<void> {
    const currentIndex = await this.gamesApi.getGames();

    await this.db.transaction().execute(async (trx) => {
      await Promise.all(
        currentIndex.map(({ id, name, lastUpdate: last_update }) =>
          trx
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
            .executeTakeFirstOrThrow(),
        ),
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
              created_at: sql<string>`date()`,
            })
            .executeTakeFirstOrThrow(),
        ),
      );
    });
  }
}
