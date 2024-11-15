import { Game } from "$ipc/main-renderer";
import { makeServiceIdentifier } from "$node-base/utils";

const GameDataService =
  makeServiceIdentifier<GameDataService>("game info service");
interface GameDataService {
  getGames(ids: string[]): Promise<Game[]>;
}
export { GameDataService };
