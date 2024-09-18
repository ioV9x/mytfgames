import path from "node:path";

import { createLogger, levelFromName, stdSerializers } from "bunyan";
import { app } from "electron/main";
import { ContainerModule } from "inversify";

import { AppConfigurationTree } from "$node-base/configuration";

import { BaseLogger, CategoryLogger, LogCategoryKey } from "./constants.mjs";

export const LogModule = new ContainerModule((bind) => {
  bind(BaseLogger)
    .toDynamicValue((ctx) =>
      createLogger({
        name: "app",
        hostname: "N/A",
        streams: [
          {
            level: app.isPackaged ? levelFromName.info : levelFromName.debug,
            path: path.join(
              ctx.container.get(AppConfigurationTree).paths.logs,
              "app.log",
            ),
          },
        ],
        serializers: stdSerializers,
      }),
    )
    .inSingletonScope();

  bind(CategoryLogger)
    .toDynamicValue((ctx) => {
      const category = ctx.currentRequest.target
        .getCustomTags()
        ?.find(({ key }) => key === LogCategoryKey);
      if (category == null) {
        throw new Error("No category provided");
      }
      if (typeof category.value !== "string") {
        throw new Error("Category must be a string");
      }
      const baseLogger = ctx.container.get(BaseLogger);

      return baseLogger.child({ category: category.value });
    })
    .inTransientScope();
});
