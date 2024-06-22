import { makeRemoteServiceCollectionDescriptor } from "$ipc/core";

import { GameInfoService } from "./GameInfoService.mjs";
import { LocalGameDataService } from "./LocalGameDataService.mjs";
import { RemoteGameDataService } from "./RemoteGameDataService.mjs";
import { UserService } from "./UserService.mjs";

export * from "./GameInfoService.mjs";
export * from "./LocalGameDataService.mjs";
export * from "./RemoteGameDataService.mjs";
export * from "./UserService.mjs";

export default makeRemoteServiceCollectionDescriptor({
  user: UserService,
  gameInfo: GameInfoService,
  localGames: LocalGameDataService,
  remoteGames: RemoteGameDataService,
});
