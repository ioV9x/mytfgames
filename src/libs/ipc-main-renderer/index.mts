import { makeRemoteServiceCollectionDescriptor } from "$pure-base/ipc";

import { ArtifactService } from "./ArtifactService.mjs";
import { GameDataService } from "./GameDataService.mjs";
import { GameVersionService } from "./GameVersionService.mjs";
import { UserService } from "./UserService.mjs";

export * from "./ArtifactService.mjs";
export * from "./GameDataService.mjs";
export * from "./GameVersionService.mjs";
export * from "./UserService.mjs";

export default makeRemoteServiceCollectionDescriptor({
  artifacts: ArtifactService,
  games: GameDataService,
  gameVersions: GameVersionService,
  user: UserService,
});
