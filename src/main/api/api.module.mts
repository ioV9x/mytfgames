import { ContainerModule } from "inversify";

import { IpcServiceProvider } from "$main/pal";

import { GamesApi, GamesApiImpl } from "./games.mjs";

export const ApiModule = new ContainerModule((bind) => {
  bind(GamesApiImpl).toSelf().inSingletonScope();
  bind(GamesApi).toService(GamesApiImpl);
  // bind(IpcServiceProvider).toService(GamesApiImpl);
});
