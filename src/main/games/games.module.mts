import { ContainerModule } from "inversify";

import { IpcServiceProvider } from "$node-base/ipc";

import { DefaultGameDataService } from "./DefaultGameDataService.mjs";
import { DefaultGameInfoImporter } from "./DefaultGameInfoImporter.mjs";
import { DefaultGameVersionService } from "./DefaultGameVersionService.mjs";
import { GameDataService } from "./GameDataService.mjs";
import { GameVersionService } from "./GameVersionService.mjs";

export const GamesModule = new ContainerModule((bind) => {
  bind(GameDataService).to(DefaultGameDataService).inSingletonScope();
  bind(IpcServiceProvider).toService(GameDataService);

  bind(DefaultGameVersionService).toSelf().inSingletonScope();
  bind(GameVersionService).toService(DefaultGameVersionService);
  bind(IpcServiceProvider).toService(GameVersionService);

  bind(DefaultGameInfoImporter).toSelf().inSingletonScope();
  bind(IpcServiceProvider).toService(DefaultGameInfoImporter);
});
