import { ContainerModule } from "inversify";

import {
  AppConfiguration,
  AppConfigurationLoader,
} from "./AppConfiguration.mjs";
import {
  ElectronAppConfiguration,
  ElectronAppConfigurationLoader,
} from "./ElectronAppConfiguration.mjs";

export const ConfigurationModule = new ContainerModule((bind) => {
  bind(AppConfiguration).to(ElectronAppConfiguration).inSingletonScope();
  bind(AppConfigurationLoader)
    .to(ElectronAppConfigurationLoader)
    .inTransientScope();
});
