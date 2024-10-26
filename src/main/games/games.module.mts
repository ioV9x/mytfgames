import { ContainerModule } from "inversify";

import { JobSource } from "$main/pal";
import { IpcServiceProvider } from "$node-base/ipc";

import { DefaultGameDataService } from "./DefaultGameDataService.mjs";
import { DefaultGameVersionService } from "./DefaultGameVersionService.mjs";
import { GameDataService } from "./GameDataService.mjs";
import { GameListingSyncSchedule } from "./GameListingSyncSchedule.mjs";
import { GameVersionService } from "./GameVersionService.mjs";

export const GamesModule = new ContainerModule((bind) => {
  bind(GameDataService).to(DefaultGameDataService).inSingletonScope();
  bind(IpcServiceProvider).toService(GameDataService);

  bind(DefaultGameVersionService).toSelf().inSingletonScope();
  bind(GameVersionService).toService(DefaultGameVersionService);
  bind(IpcServiceProvider).toService(GameVersionService);

  bind(JobSource).to(GameListingSyncSchedule).inSingletonScope();
});
