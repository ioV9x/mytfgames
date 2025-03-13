import { ContainerModule } from "inversify";

import { AppConfiguration } from "./AppConfiguration.mjs";
import { NodeAppConfiguration } from "./NodeAppConfiguration.mjs";

export const BaseConfigurationModule = new ContainerModule(({ bind }) => {
  bind(AppConfiguration).to(NodeAppConfiguration).inSingletonScope();
});
