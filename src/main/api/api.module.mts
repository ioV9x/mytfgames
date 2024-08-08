import { net } from "electron/main";
import { ContainerModule } from "inversify";

import { DefaultUcpApiService } from "./DefaultUcpApiService.mjs";
import { GamesApi, GamesApiImpl } from "./games.mjs";
import { UcpApiService } from "./UcpApiService.mjs";

export const ApiModule = new ContainerModule((bind) => {
  bind(GamesApiImpl).toSelf().inSingletonScope();
  bind(GamesApi).toService(GamesApiImpl);

  bind(DefaultUcpApiService).toConstantValue(new DefaultUcpApiService(net));
  bind(UcpApiService).toService(DefaultUcpApiService);
});
