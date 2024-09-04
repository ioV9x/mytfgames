import { ContainerModule } from "inversify";

import { IpcServiceProvider, JobSchedule } from "$main/pal";

import { DefaultGameDataService } from "./DefaultGameDataService.mjs";
import { DefaultGameVersionService } from "./DefaultGameVersionService.mjs";
import { GameDataService } from "./GameDataService.mjs";
import { GameListingSyncSchedule } from "./GameListingSyncSchedule.mjs";

export const GamesModule = new ContainerModule((bind) => {
  bind(GameDataService).to(DefaultGameDataService).inSingletonScope();
  bind(IpcServiceProvider).toService(GameDataService);

  bind(DefaultGameVersionService).toSelf().inSingletonScope();
  bind(IpcServiceProvider).toService(DefaultGameVersionService);

  bind(JobSchedule).to(GameListingSyncSchedule).inSingletonScope();
});
