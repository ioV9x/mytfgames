import { ContainerModule } from "inversify";

import { IpcServiceProvider } from "$main/pal";

import { GamesApi } from "./games.mjs";

export const ApiModule = new ContainerModule((bind) => {
  bind(IpcServiceProvider).to(GamesApi).inSingletonScope();
});
