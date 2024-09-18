import { inject, injectable } from "inversify";

import { AppConfiguration, AppConfigurationTree } from "./AppConfiguration.mjs";

@injectable()
export class NodeAppConfiguration implements AppConfiguration {
  constructor(
    @inject(AppConfigurationTree) readonly root: AppConfigurationTree,
  ) {}
}
