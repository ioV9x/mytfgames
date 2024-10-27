import { inject, injectable } from "inversify";
import * as R from "remeda";
import * as uuid from "uuid";

import {
  ArtifactPlatform,
  GameSId,
  GameVersion,
  GameVersionService as GameVersionServiceContract,
} from "$ipc/main-renderer";
import {
  DatabaseProvider,
  GameId,
  WellKnownDirectory,
} from "$node-base/database";
import { remoteProcedure } from "$pure-base/ipc";

import { GameVersionService } from "./GameVersionService.mjs";

const disablingDirectories: bigint[] = [
  WellKnownDirectory.TMP_IMPORT,
  WellKnownDirectory.CLEANUP_QUEUE,
];

@injectable()
export class DefaultGameVersionService implements GameVersionService {
  constructor(
    @inject(DatabaseProvider) private readonly db: DatabaseProvider,
  ) {}

  retrieveVersionInfoForGame(
    gameId: GameSId | GameId,
    version: string,
  ): Promise<GameVersion> {
    const id =
      typeof gameId === "string" ? (uuid.parse(gameId) as GameId) : gameId;

    return this.db.transaction().execute(async (trx) => {
      const versionRow = await trx
        .selectFrom("game_version")
        .select(["note"])
        .where("game_id", "=", id)
        .where("version", "=", version)
        .executeTakeFirstOrThrow();

      const sources = await trx
        .selectFrom("game_version_source")
        .select(["uri", "official_note as officialNote"])
        .where("game_id", "=", id)
        .where("version", "=", version)
        .execute();

      const artifacts = await trx
        .selectFrom("game_version_artifact as artifact")
        .leftJoin("node_member", "node_member.node_no", "artifact.node_no")
        .select(["platform_type as platform", "node_member.node_no_parent"])
        .where("game_id", "=", id)
        .where("version", "=", version)
        .execute();

      return {
        gameId: typeof gameId === "string" ? gameId : uuid.stringify(id),
        version,
        note: versionRow.note,
        sources,
        artifacts: artifacts.map(({ platform, node_no_parent }) => ({
          platform,
          disabled:
            !node_no_parent ||
            disablingDirectories.includes(BigInt(node_no_parent)),
        })),
      };
    });
  }

  @remoteProcedure(GameVersionServiceContract, "getArtifactPlatforms")
  async artifactPlatforms(): Promise<ArtifactPlatform[]> {
    const platforms = await this.db
      .selectFrom("artifact_platform")
      .select(["platform_type as id", "name", "user_defined as userDefined"])
      .execute();
    return platforms.map(({ id, name, userDefined }) => ({
      id,
      name,
      userDefined: userDefined !== 0,
    }));
  }

  @remoteProcedure(GameVersionServiceContract, "retrieveVersionsForGame")
  async retrieveVersionsForGame(
    gameId: GameSId | GameId,
  ): Promise<GameVersion[]> {
    const id =
      typeof gameId === "string" ? (uuid.parse(gameId) as GameId) : gameId;

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
            .selectFrom("game_version_artifact as artifact")
            .leftJoin("node_member", "node_member.node_no", "artifact.node_no")
            .select([
              "version",
              "platform_type as platform",
              "node_member.node_no_parent",
            ])
            .where("game_id", "=", id)
            .execute(),
        ]),
      );

    const groupedSources = R.groupBy(sources, (s) => s.version);
    const groupedArtifacts = R.groupBy(artifacts, (a) => a.version);
    return versions.map(({ note, version }) => ({
      gameId: typeof gameId === "string" ? gameId : uuid.stringify(gameId),
      version,
      note,
      sources:
        groupedSources[version]?.map(({ officialNote, uri }) => ({
          officialNote,
          uri,
        })) ?? [],
      artifacts:
        groupedArtifacts[version]?.map(({ platform, node_no_parent }) => ({
          platform,
          disabled:
            !node_no_parent ||
            disablingDirectories.includes(BigInt(node_no_parent)),
        })) ?? [],
    }));
  }
}
