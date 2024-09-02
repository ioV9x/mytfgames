import { ContainerModule } from "inversify";

import { IpcServiceProvider, JobSchedule } from "$main/pal";

import { GameInfoService } from "./GameInfoService.mjs";
import { GameInfoServiceImpl } from "./GameInfoServiceImpl.mjs";
import { RemoteGameSyncSchedule } from "./RemoteGameSyncSchedule.mjs";

export const GamesModule = new ContainerModule((bind) => {
  bind(GameInfoService).to(GameInfoServiceImpl).inSingletonScope();
  bind(IpcServiceProvider).toService(GameInfoService);
  bind(JobSchedule).to(RemoteGameSyncSchedule).inSingletonScope();
});
