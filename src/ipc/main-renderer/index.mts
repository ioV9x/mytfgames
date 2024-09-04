import { makeRemoteServiceCollectionDescriptor } from "$ipc/core";

import { GameDataService } from "./GameDataService.mjs";
import { UserService } from "./UserService.mjs";

export * from "./GameDataService.mjs";
export * from "./UserService.mjs";

export default makeRemoteServiceCollectionDescriptor({
  user: UserService,
  games: GameDataService,
});
