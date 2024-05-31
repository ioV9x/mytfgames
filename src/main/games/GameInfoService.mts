import { GameInfo } from "$ipc/main-renderer";
import { makeServiceIdentifier } from "$main/utils";

const GameInfoService =
  makeServiceIdentifier<GameInfoService>("game info service");
interface GameInfoService {
  refreshIndex(): Promise<GameInfo[]>;
}
export { GameInfoService };
