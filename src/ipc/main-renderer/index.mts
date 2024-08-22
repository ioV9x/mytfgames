import { makeRemoteServiceCollectionDescriptor } from "$ipc/core";

import { GameDataService } from "./GameDataService.mjs";
import { GameInfoService } from "./GameInfoService.mjs";
import { LocalGameDataService } from "./LocalGameDataService.mjs";
import { RemoteGameDataService } from "./RemoteGameDataService.mjs";
import { UserService } from "./UserService.mjs";

export * from "./GameDataService.mjs";
export * from "./LocalGameDataService.mjs";
export * from "./RemoteGameDataService.mjs";
export * from "./UserService.mjs";

export default makeRemoteServiceCollectionDescriptor({
  user: UserService,
  games: GameDataService,
  gameInfo: GameInfoService,
  localGames: LocalGameDataService,
  remoteGames: RemoteGameDataService,
});
