import { promises as fsa } from "node:fs";
import path from "node:path";

import { inject, injectable } from "inversify";

import {
  BundledArtifactInfo,
  BundledGameInfo,
  BundledVersionInfo,
  GameInfoParser,
} from "$game-info/parser";

import { BundledGameMetadata } from "./GameInfoLoader.mjs";

const META_FOLDER_NAME = ".meta";
const CHANGELOGS_FOLDER_NAME = "changelogs";
const GAME_MD_FILENAME = "game.md";

@injectable()
export class DefaultGameInfoLoader {
  constructor(
    @inject(GameInfoParser) private readonly gameInfoParser: GameInfoParser,
  ) {}

  async loadGameInfoFromMetaFolder(
    artifactFolder: string,
  ): Promise<BundledGameMetadata> {
    const metaFolderPath = path.join(artifactFolder, META_FOLDER_NAME);
    const gameMdPath = path.join(metaFolderPath, GAME_MD_FILENAME);
    const changelogsDirPath = path.join(metaFolderPath, CHANGELOGS_FOLDER_NAME);

    const [gameInfo, versionInfo] = await Promise.all([
      this.loadBundledGameInfo(gameMdPath),
      this.loadAllBundledVersionInfo(changelogsDirPath),
    ]);
    return { gameInfo, versionInfo };
  }

  async loadBundledGameInfo(gameMdPath: string): Promise<BundledGameInfo> {
    const gameMD = await fsa.readFile(gameMdPath, "utf-8");
    return this.gameInfoParser.parseGameInfo(gameMD);
  }

  async loadBundledArtifactInfo(
    artifactYamlPath: string,
  ): Promise<BundledArtifactInfo> {
    const artifactYaml = await fsa.readFile(artifactYamlPath, "utf-8");
    return this.gameInfoParser.parseArtifactYaml(artifactYaml);
  }

  async loadAllBundledVersionInfo(
    changelogsDirPath: string,
  ): Promise<BundledVersionInfo[]> {
    const changelogFiles = await fsa.readdir(changelogsDirPath, {
      withFileTypes: true,
      recursive: false,
    });
    const versionInfos = await Promise.all(
      changelogFiles.map(async (changelogDirent) => {
        if (!changelogDirent.isFile()) {
          return null;
        }
        const changelogFilename = changelogDirent.name;
        if (
          changelogFilename.length < 4 || // require at least one version character
          changelogFilename.slice(-3).toLowerCase() !== ".md"
        ) {
          return null;
        }

        const version = changelogFilename.slice(0, -3);
        try {
          return await this.loadBundledVersionInfo(
            version,
            path.join(changelogsDirPath, changelogFilename),
          );
        } catch {
          return null;
        }
      }),
    );
    return versionInfos.filter((v) => v != null);
  }
  async loadBundledVersionInfo(version: string, changelogMdPath: string) {
    const changelogMD = await fsa.readFile(changelogMdPath, "utf-8");
    return this.gameInfoParser.parseChangelog(version, changelogMD);
  }
}
