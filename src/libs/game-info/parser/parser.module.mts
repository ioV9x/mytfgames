import { ContainerModule } from "inversify";

import { DefaultGameInfoParser } from "./DefaultGameInfoParser.mjs";
import { GameInfoParser } from "./GameInfoParser.mjs";

export const GameInfoParserModule = new ContainerModule((bind) => {
  bind(GameInfoParser).to(DefaultGameInfoParser).inTransientScope();
});
