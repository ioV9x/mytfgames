import { ContainerModule } from "inversify";

import { AppConfigurationLoader } from "./AppConfiguration.mjs";
import { ElectronAppConfigurationLoader } from "./ElectronAppConfiguration.mjs";

export const ConfigurationModule = new ContainerModule((bind) => {
  bind(AppConfigurationLoader)
    .to(ElectronAppConfigurationLoader)
    .inTransientScope();
});
