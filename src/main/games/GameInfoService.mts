import { GameInfo, GameList, GameOrderType } from "$ipc/main-renderer";
import { makeServiceIdentifier } from "$main/utils";

const GameInfoService =
  makeServiceIdentifier<GameInfoService>("game info service");
interface GameInfoService {
  getGames(ids: string[]): Promise<GameInfo[]>;
  getGameList(
    order: GameOrderType,
    page: number,
    pageSize: number,
    force: boolean,
  ): Promise<GameList>;
}
export { GameInfoService };
