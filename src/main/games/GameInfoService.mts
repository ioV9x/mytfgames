import { GameInfo, GameList, GameOrderType } from "$ipc/main-renderer";
import { GameId, TfgamesGameId } from "$main/database";
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

  downloadGameInfo(id: number): Promise<void>;
  refreshIndex(): Promise<[GameId, TfgamesGameId][]>;
}
export { GameInfoService };
