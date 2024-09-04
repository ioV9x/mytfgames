import { GameId, TfgamesGameId } from "$main/database";
import { makeServiceIdentifier } from "$main/utils";

const GameDataService =
  makeServiceIdentifier<GameDataService>("game info service");
interface GameDataService {
  downloadGameInfo(id: number): Promise<void>;
  refreshIndex(): Promise<[GameId, TfgamesGameId][]>;
}
export { GameDataService };
