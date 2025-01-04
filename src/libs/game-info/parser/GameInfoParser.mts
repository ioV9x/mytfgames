import { makeServiceIdentifier } from "$node-base/utils";

const GameInfoParser =
  makeServiceIdentifier<GameInfoParser>("game info parser");
interface GameInfoParser {
  parseGameInfo(gameMD: string): BundledGameInfo;
  parseArtifactYaml(artifactYaml: string): BundledArtifactInfo;
  parseChangelog(version: string, changelogMD: string): BundledVersionInfo;
}

export { GameInfoParser };

export interface BundledGameInfo {
  metadataVersion: number;
  name: string;
  synopsis: string;
  description: string;
  ids: BundledGameIds;
  authors: BundledAuthorInfo[];
  tags: string[];
}

export interface BundledGameIds {
  uuid: Buffer;
  tfgamesSiteGameId: number | null;
}
export interface BundledAuthorInfo {
  metadataVersion: number;
  uuid: Buffer;
  name: string;
  tfgamesSiteProfileId: number | null;
}

export interface BundledArtifactInfo {
  version: string;
  platform: string;
}

export interface BundledVersionInfo {
  version: string;
  note: string;
}
