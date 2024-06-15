import { inject, injectable } from "inversify";
import { Insertable, sql } from "kysely";
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
import {
  CategoryType,
  DatabaseProvider,
  RemoteCategoryTable,
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

    const updatedIds = await this.db.transaction().execute(async (trx) => {
      return await Promise.all(
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
            .returning("id as id")
            .executeTakeFirstOrThrow(),
        ),
      );
    });

    for (const { id } of updatedIds.slice(0, 16)) {
      try {
        await this.downloadGameInfo(id);
      } catch (exc) {
        console.error(`Failed to download game info for game ${id}`, exc);
        return;
      }
    }
  }

  async downloadGameInfo(id: number): Promise<void> {
    const gameDetails = await this.gamesApi.getGameDetails(id);

    await this.db.transaction().execute(async (trx) => {
      const last_crawled = Temporal.Now.instant().toString({
        smallestUnit: "second",
      });
      await trx
        .insertInto("remote_game")
        .values({
          id: gameDetails.id,
          name: gameDetails.name,
          last_update: gameDetails.lastUpdate,
          release_date: gameDetails.releaseDate,
          last_crawled,
        })
        .onConflict((oc) =>
          oc.column("id").doUpdateSet({
            name: gameDetails.name,
            last_update: gameDetails.lastUpdate,
            release_date: gameDetails.releaseDate,
            last_crawled,
          }),
        )
        .execute();

      await Promise.all(
        gameDetails.authors.map((author) =>
          trx
            .insertInto("remote_author")
            .values({
              id: author.id,
              name: author.name,
            })
            .onConflict((oc) =>
              oc.column("id").doUpdateSet({
                name: author.name,
              }),
            )
            .execute(),
        ),
      );
      await Promise.all(
        gameDetails.authors.map((author) =>
          trx
            .insertInto("remote_game_author")
            .values({
              game_id: gameDetails.id,
              author_id: author.id,
            })
            .onConflict((oc) =>
              oc.columns(["game_id", "author_id"]).doNothing(),
            )
            .execute(),
        ),
      );

      const categories: Insertable<RemoteCategoryTable>[] = [
        gameDetails.transformationThemes.map((tft) => ({
          rid: tft.id,
          type: CategoryType.Transformation,
          name: tft.name,
          abbreviation: tft.abbreviation,
        })),
      ].flat();

      const categoryIds = await Promise.all(
        categories.map((category) =>
          trx
            .insertInto("remote_category")
            .values(category)
            .onConflict((oc) =>
              oc.columns(["type", "rid"]).doUpdateSet({
                name: category.name,
                abbreviation: category.abbreviation,
              }),
            )
            .returning("id as id")
            .executeTakeFirstOrThrow(),
        ),
      );
      await Promise.all(
        categoryIds.map((category) =>
          trx
            .insertInto("remote_game_category")
            .values({
              game_id: gameDetails.id,
              category_id: category.id,
            })
            .onConflict((oc) =>
              oc.columns(["game_id", "category_id"]).doNothing(),
            )
            .execute(),
        ),
      );

      await Promise.all(
        gameDetails.versions.flatMap((versionInfo) =>
          versionInfo.downloads.map((downloadInfo) =>
            trx
              .insertInto("remote_game_version")
              .values({
                game_id: gameDetails.id,
                version: versionInfo.version,
                url: downloadInfo.link,
                name: downloadInfo.name,
                note: downloadInfo.note,
              })
              .onConflict((oc) =>
                oc.columns(["game_id", "version", "url"]).doUpdateSet({
                  name: downloadInfo.name,
                  note: downloadInfo.note,
                }),
              )
              .execute(),
          ),
        ),
      );
    });
  }
}
