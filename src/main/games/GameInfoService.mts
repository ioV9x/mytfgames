import { GameId, TfgamesGameId } from "$main/database";
import { makeServiceIdentifier } from "$main/utils";

const GameInfoService =
  makeServiceIdentifier<GameInfoService>("game info service");
interface GameInfoService {
  downloadGameInfo(id: number): Promise<void>;
  refreshIndex(): Promise<[GameId, TfgamesGameId][]>;
}
export { GameInfoService };
