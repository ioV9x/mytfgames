import { Game } from "$ipc/main-renderer";
import { makeServiceIdentifier } from "$node-base/utils";

const GameInfoParser =
  makeServiceIdentifier<GameInfoParser>("game info parser");
interface GameInfoParser {
  parseGameInfo(gameMD: string): Promise<Game>;
}

export { GameInfoParser };
