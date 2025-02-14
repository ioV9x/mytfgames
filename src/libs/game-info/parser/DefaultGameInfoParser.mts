import parseFrontMatter from "gray-matter";
import { inject, injectable } from "inversify";
import { load as yamlLoad } from "js-yaml";
import { Temporal } from "temporal-polyfill";
import * as uuid from "uuid";

import { Ajv } from "$node-base/utils";

import {
  ArtifactMetadataType,
  ArtifactMetadataTypeDefinition,
  ArtifactMetadataValidationFunction,
  ChangelogFrontMatterType,
  ChangelogFrontMatterTypeDefinition,
  ChangelogFrontMatterValidationFunction,
  GameInfoFrontMatterType,
  GameInfoFrontMatterTypeDefinition,
  GameInfoFrontMatterValidationFunction,
} from "./GameInfoJTDs.mjs";
import {
  BundledArtifactInfo,
  BundledAuthorInfo,
  BundledGameInfo,
  BundledVersionInfo,
  GameInfoParser,
} from "./GameInfoParser.mjs";

// note that the parser explicitly re-creates all objects and arrays while
// explicitly naming the properties to ensure that no extra properties are
// present in the parsed data

@injectable()
export class DefaultGameInfoParser implements GameInfoParser {
  readonly #validateGameInfoFrontMatter: GameInfoFrontMatterValidationFunction;
  readonly #validateArtifactMetadata: ArtifactMetadataValidationFunction;
  readonly #validateChangelogFrontMatter: ChangelogFrontMatterValidationFunction;

  constructor(@inject(Ajv) private readonly ajv: Ajv) {
    this.#validateGameInfoFrontMatter =
      this.ajv.compile<GameInfoFrontMatterType>(
        GameInfoFrontMatterTypeDefinition,
      );
    this.#validateArtifactMetadata = this.ajv.compile<ArtifactMetadataType>(
      ArtifactMetadataTypeDefinition,
    );
    this.#validateChangelogFrontMatter =
      this.ajv.compile<ChangelogFrontMatterType>(
        ChangelogFrontMatterTypeDefinition,
      );
  }

  parseGameInfo(gameMD: string): BundledGameInfo {
    const parsed = parseFrontMatter(gameMD, {
      language: "yaml",
    });

    if (!this.#validateGameInfoFrontMatter(parsed.data)) {
      throw new Error("Invalid game metadata", {
        cause: this.#validateGameInfoFrontMatter.errors,
      });
    }
    let gameUuid: Buffer;
    try {
      gameUuid = uuid.parse(parsed.data.ids.uuid) as Buffer;
    } catch (error) {
      throw new Error("Invalid game UUID", { cause: error });
    }

    const authors = parsed.data.authors.map((author, authorIndex) => {
      let authorUuid: Buffer;
      try {
        authorUuid = uuid.parse(author.uuid) as Buffer;
      } catch (error) {
        throw new Error(`Invalid author UUID at index ${authorIndex}`, {
          cause: error,
        });
      }
      return {
        metadataTimestamp: sanitizeMetadataTimestamp(
          author["metadata-timestamp"],
        ),
        uuid: authorUuid,
        name: author.name,
        tfgamesSiteProfileId: author["tfgames.site"] ?? null,
      } satisfies BundledAuthorInfo;
    });

    return {
      metadataTimestamp: sanitizeMetadataTimestamp(
        parsed.data["metadata-timestamp"],
      ),
      name: parsed.data.name,
      synopsis: parsed.data.synopsis,
      description: parsed.content,
      ids: {
        uuid: gameUuid,
        tfgamesSiteGameId: parsed.data.ids["tfgames.site"] ?? null,
      },
      authors,
      tags: parsed.data.tags,
    };
  }

  parseArtifactYaml(artifactYaml: string): BundledArtifactInfo {
    const parsed = yamlLoad(artifactYaml);

    if (!this.#validateArtifactMetadata(parsed)) {
      throw new Error("Invalid artifact metadata", {
        cause: this.#validateArtifactMetadata.errors,
      });
    }

    return {
      version: parsed.version,
      platform: parsed.platform,
    };
  }

  parseChangelog(version: string, changelogMD: string): BundledVersionInfo {
    const parsed = parseFrontMatter(changelogMD, {
      language: "yaml",
    });

    if (!this.#validateChangelogFrontMatter(parsed.data)) {
      throw new Error(`Invalid changelog metadata for "${version}"`, {
        cause: this.#validateChangelogFrontMatter.errors,
      });
    }

    return {
      version,
      note: parsed.content,
    };
  }
}

function sanitizeMetadataTimestamp(timestamp: string | Date): number {
  return toHistoricalUnixTimestamp(timestamp).epochMilliseconds / 1000;
}
function toHistoricalUnixTimestamp(timestamp: string | Date): Temporal.Instant {
  const parsed = toUnixTimestamp(timestamp);
  const now = Temporal.Now.instant();
  const ltd = Temporal.Instant.compare(parsed, now) > 0 ? now : parsed;
  return ltd.round({ smallestUnit: "second", roundingMode: "floor" });
}
function toUnixTimestamp(timestamp: string | Date): Temporal.Instant {
  return typeof timestamp === "string"
    ? Temporal.Instant.from(timestamp)
    : Temporal.Instant.fromEpochMilliseconds(timestamp.getTime());
}
