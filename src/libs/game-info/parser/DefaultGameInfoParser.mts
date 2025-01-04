import parseFrontMatter from "gray-matter";
import { inject, injectable } from "inversify";
import { load as yamlLoad } from "js-yaml";
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
        metadataVersion: author["metadata-version"],
        uuid: authorUuid,
        name: author.name,
        tfgamesSiteProfileId: author["tfgames.site"] ?? null,
      } satisfies BundledAuthorInfo;
    });

    return {
      metadataVersion: parsed.data["metadata-version"],
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
