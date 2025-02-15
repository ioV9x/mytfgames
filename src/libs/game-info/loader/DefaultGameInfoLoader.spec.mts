import * as path from "node:path";

import { Ajv } from "ajv/dist/jtd";
import { beforeEach, describe, expect, it } from "vitest";

import { DefaultGameInfoParser } from "../parser/DefaultGameInfoParser.mjs";
import { DefaultGameInfoLoader } from "./DefaultGameInfoLoader.mjs";

describe("DefaultGameInfoLoader", () => {
  const ajv = new Ajv({ timestamp: "string" });
  let gameInfoParser: DefaultGameInfoParser;

  beforeEach(() => {
    gameInfoParser = new DefaultGameInfoParser(ajv);
  });

  it("should be instantiatable", () => {
    const subject = new DefaultGameInfoLoader(gameInfoParser);
    expect(subject).toBeInstanceOf(DefaultGameInfoLoader);
  });

  describe("instance", () => {
    let subject: DefaultGameInfoLoader;

    beforeEach(() => {
      subject = new DefaultGameInfoLoader(gameInfoParser);
    });

    it("should load game info from the meta folder", async () => {
      const gameMdPath = path.join(import.meta.dirname, "test/meta-0/game.md");

      const gameInfo = subject.loadBundledGameInfo(gameMdPath);
      await expect(gameInfo).resolves.matchSnapshot();
    });
    it("should throw an error when loading game info from a non-existent path", async () => {
      const gameMdPath = path.join(
        import.meta.dirname,
        "test/meta-0/does-not-exist.md",
      );

      const gameInfo = subject.loadBundledGameInfo(gameMdPath);
      await expect(gameInfo).rejects.toMatchObject({
        code: "ENOENT",
      });
    });

    it("should load artifact info from the meta folder", async () => {
      const artifactYamlPath = path.join(
        import.meta.dirname,
        "test/meta-0/artifact.yaml",
      );

      const artifactInfo = subject.loadBundledArtifactInfo(artifactYamlPath);
      await expect(artifactInfo).resolves.matchSnapshot();
    });
    it("should throw an error when loading artifact info from a non-existent path", async () => {
      const artifactYamlPath = path.join(
        import.meta.dirname,
        "test/meta-0/does-not-exist.yaml",
      );

      const artifactInfo = subject.loadBundledArtifactInfo(artifactYamlPath);
      await expect(artifactInfo).rejects.toMatchObject({
        code: "ENOENT",
      });
    });

    it("should load all bundled version info from the changelogs folder", async () => {
      const changelogsDirPath = path.join(
        import.meta.dirname,
        "test/meta-0/changelogs",
      );

      const versionInfos = subject.loadAllBundledVersionInfo(changelogsDirPath);
      await expect(versionInfos).resolves.matchSnapshot();
    });
    it("should throw an error when loading version info from a non-existent path", async () => {
      const changelogsDirPath = path.join(
        import.meta.dirname,
        "test/meta-0/does-not-exist",
      );

      const versionInfos = subject.loadAllBundledVersionInfo(changelogsDirPath);
      await expect(versionInfos).rejects.toMatchObject({
        code: "ENOENT",
      });
    });
  });
});
