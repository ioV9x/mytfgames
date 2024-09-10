import { GameId, TfgamesGameId } from "$node-libs/database";
import { makeServiceIdentifier } from "$node-libs/utils";

const GameDataService =
  makeServiceIdentifier<GameDataService>("game info service");
interface GameDataService {
  downloadGameInfo(id: number): Promise<void>;
  refreshIndex(): Promise<[GameId, TfgamesGameId][]>;
}
export { GameDataService };
