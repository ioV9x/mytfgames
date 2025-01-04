import { BundledGameInfo, BundledVersionInfo } from "$game-info/parser";
import { makeServiceIdentifier } from "$node-base/utils";

const GameInfoLoader =
  makeServiceIdentifier<GameInfoLoader>("game info loader");
interface GameInfoLoader {
  loadGameInfoFromMetaFolder(
    metaFolderPath: string,
  ): Promise<BundledGameMetadata>;
}

export { GameInfoLoader };

export interface BundledGameMetadata {
  gameInfo: BundledGameInfo;
  versionInfo: BundledVersionInfo[];
}
