import { inject, injectable } from "inversify";
import * as R from "remeda";
import * as uuid from "uuid";

import {
  GameSId,
  GameVersion,
  GameVersionService as GameVersionServiceContract,
} from "$ipc/main-renderer";
import { DatabaseProvider, GameId } from "$node-base/database";
import { remoteProcedure } from "$pure-base/ipc";

@injectable()
export class DefaultGameVersionService {
  constructor(
    @inject(DatabaseProvider) private readonly db: DatabaseProvider,
  ) {}

  @remoteProcedure(GameVersionServiceContract, "retrieveVersionsForGame")
  async retrieveVersionsForGame(gameId: GameSId): Promise<GameVersion[]> {
    const id = uuid.parse(gameId) as GameId;

    const [versions, sources, artifacts] = await this.db
      .transaction()
      .execute(async (trx) =>
        Promise.all([
          trx
            .selectFrom("game_version")
            .select(["version", "note"])
            .where("game_id", "=", id)
            .orderBy("version", "desc")
            .execute(),
          trx
            .selectFrom("game_version_source")
            .select(["version", "uri", "official_note as officialNote"])
            .where("game_id", "=", id)
            .execute(),
          trx
            .selectFrom("game_version_artifact")
            .select([
              "version",
              "platform_type as platform",
              "node_no as rootNodeNo",
            ])
            .where("game_id", "=", id)
            .execute(),
        ]),
      );

    const groupedSources = R.groupBy(sources, (s) => s.version);
    const groupedArtifacts = R.groupBy(artifacts, (a) => a.version);
    return versions.map(({ note, version }) => ({
      gameId,
      version,
      note,
      sources: groupedSources[version] ?? [],
      artifacts: groupedArtifacts[version] ?? [],
    }));
  }
}
