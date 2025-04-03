import path from "node:path";

import { createLogger, levelFromName, stdSerializers } from "bunyan";
import { app } from "electron/main";
import {
  BindToFluentSyntax,
  ContainerModule,
  ServiceIdentifier,
} from "inversify";

import { AppConfigurationTree } from "$node-base/configuration";

import { LOG_CATEGORY_REGISTRY } from "./categories.mjs";
import { BaseLogger } from "./constants.mjs";
import { Logger } from "./logger.mjs";

type BindFn = <T>(
  this: void,
  serviceIdentifier: ServiceIdentifier<T>,
) => BindToFluentSyntax<T>;
export function bindDynamicCategoryLoggers(bind: BindFn): void {
  for (const registration of Object.entries(LOG_CATEGORY_REGISTRY) as [
    string,
    ServiceIdentifier<Logger>,
  ][]) {
    bindCategoryLogger(bind, ...registration);
  }
}
function bindCategoryLogger(
  bind: BindFn,
  categoryId: string,
  categoryLogger: ServiceIdentifier<Logger>,
): void {
  bind(categoryLogger)
    .toResolvedValue(
      (logger) => logger.child({ category: categoryId }),
      [BaseLogger],
    )
    .inTransientScope();
}

export const LogModule = new ContainerModule(({ bind }) => {
  bind(BaseLogger)
    .toResolvedValue(
      (appConfigurationTree) =>
        createLogger({
          name: "app",
          hostname: "N/A",
          streams: [
            {
              level: app.isPackaged ? levelFromName.info : levelFromName.debug,
              path: path.join(appConfigurationTree.paths.logs, "app.log"),
            },
          ],
          serializers: stdSerializers,
        }),
      [AppConfigurationTree],
    )
    .inSingletonScope();
});
