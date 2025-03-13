import { ContainerModule } from "inversify";

import { DefaultGameInfoLoader } from "./DefaultGameInfoLoader.mjs";
import { GameInfoLoader } from "./GameInfoLoader.mjs";

export const GameInfoLoaderModule = new ContainerModule(({ bind }) => {
  bind(GameInfoLoader).to(DefaultGameInfoLoader).inTransientScope();
});
