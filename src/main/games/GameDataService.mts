import { GameId, TfgamesGameId } from "$node-base/database";
import { makeServiceIdentifier } from "$node-base/utils";

const GameDataService =
  makeServiceIdentifier<GameDataService>("game info service");
interface GameDataService {
  downloadGameInfo(id: number): Promise<void>;
  refreshIndex(): Promise<[GameId, TfgamesGameId][]>;
}
export { GameDataService };
