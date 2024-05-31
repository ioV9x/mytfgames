import { ContainerModule } from "inversify";

import { IpcServiceProvider } from "$main/pal";

import { GameInfoService } from "./GameInfoService.mjs";
import { GameInfoServiceImpl } from "./GameInfoServiceImpl.mjs";

export const GamesModule = new ContainerModule((bind) => {
  bind(GameInfoService).to(GameInfoServiceImpl).inSingletonScope();
  bind(IpcServiceProvider).toService(GameInfoService);
});
