import { GameSId, GameVersion } from "$ipc/main-renderer";
import { GameId } from "$node-base/database";
import { makeServiceIdentifier } from "$node-base/utils";

interface GameVersionService {
  retrieveVersionsForGame(gameId: GameSId | GameId): Promise<GameVersion[]>;
  retrieveVersionInfoForGame(
    gameId: GameSId | GameId,
    version: string,
  ): Promise<GameVersion>;
}
const GameVersionService = makeServiceIdentifier<GameVersionService>(
  "game version service",
);
export { GameVersionService };
