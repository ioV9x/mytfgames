import { ContainerModule } from "inversify";

import { IpcServiceProvider, JobSchedule } from "$main/pal";

import { DefaultGameDataService } from "./DefaultGameDataService.mjs";
import { GameDataService } from "./GameDataService.mjs";
import { GameListingSyncSchedule } from "./GameListingSyncSchedule.mjs";

export const GamesModule = new ContainerModule((bind) => {
  bind(GameDataService).to(DefaultGameDataService).inSingletonScope();
  bind(IpcServiceProvider).toService(GameDataService);
  bind(JobSchedule).to(GameListingSyncSchedule).inSingletonScope();
});
