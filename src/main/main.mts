/// <reference types="vite/client" />
import "reflect-metadata/lite";

import fs from "node:fs";
import inspector from "node:inspector";
import utils from "node:util";

import { app, dialog, protocol } from "electron";
import { Container } from "inversify";

import { GameInfoLoaderModule } from "$game-info/loader/loader.module.mjs";
import { GameInfoParserModule } from "$game-info/parser/parser.module.mjs";
import { MainApp } from "$main/app";
import { AppConfigurationLoader } from "$main/configuration";
import { CustomProtocolScheme } from "$main/pal/browser";
import { AppConfigurationTree } from "$node-base/configuration";
import { BaseConfigurationModule } from "$node-base/configuration/configuration.module.mjs";
import { DatabaseDialectFactory } from "$node-base/database";
import {
  bindBetterSqliteDialect,
  DatabaseModule,
} from "$node-base/database/database.module.mjs";
import { makeServiceIdentifier } from "$node-base/utils";
import { UtilsModule } from "$node-base/utils/utils.module.mjs";

import { AppModule } from "./app/app.module.mjs";
import { ArtifactsModule } from "./artifacts/artifacts.module.mjs";
import { ConfigurationModule } from "./configuration/configuration.module.mjs";
import { migrate } from "./database/migrate.mjs";
import { GamesModule } from "./games/games.module.mjs";
import { bindDynamicCategoryLoggers, LogModule } from "./log/log.module.mjs";
import { PalBrowserModule } from "./pal/browser.module.mjs";
import { PalDialogsModule } from "./pal/dialogs.module.mjs";
import { PalIpcModule } from "./pal/Ipc/IpcModule.mjs";
import { PalWorkerModule } from "./pal/worker/worker.module.mjs";

const mainAppTypeId = makeServiceIdentifier<MainApp>("main app");

function run() {
  const [container, configuration] = initialize();

  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  const databaseDialectFactory = container.get(DatabaseDialectFactory);
  // apply migrations before starting the app in order to avoid DB access
  migrate(databaseDialectFactory, configuration.paths.database)
    .then(
      async function invokeApp() {
        // assign to global for debugging
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const mainApp = (globalThis.main = container.get(mainAppTypeId));

        await mainApp.run();
      },
      function onMigrateError(error: unknown) {
        // eslint-disable-next-line no-console
        console.error("Failed to apply migrations.\n", error);
        dialog.showErrorBox(
          "MyTFGames failed to start",
          utils.format("Failed to apply database migrations.\n", error),
        );
        app.exit(-2);
      },
    )
    .catch((error: unknown) => {
      // eslint-disable-next-line no-console
      console.error(`MainApp.run() failed.\n`, error);
      dialog.showErrorBox(
        "MyTFGames failed in an unexpected way",
        utils.format("", error),
      );
      app.exit(-1);
    });
}

function initialize(): [Container, AppConfigurationTree] {
  const container = wrapStartupErrors(
    "Failed to initialize the IoC container.",
    initializeContainer,
  );

  const configuration = wrapStartupErrors(
    "Failed to load the configuration.",
    loadConfiguration,
    container,
  );
  wrapStartupErrors(
    "Failed to create directory layout.",
    createDirectoryLayout,
    configuration.paths,
  );
  container.bind(AppConfigurationTree).toConstantValue(configuration);

  wrapStartupErrors(
    "Failed to register custom protocol privileges.",
    registerCustomProtocolPriviliges,
    container,
  );

  // instantiate main app
  container.bind(mainAppTypeId).to(MainApp).inSingletonScope();

  return [container, configuration];
}

function initializeContainer(): Container {
  const container = new Container();
  bindDynamicCategoryLoggers(container.bind.bind(container));
  bindBetterSqliteDialect(container.bind.bind(container));
  container.loadSync(
    // keep this list sorted
    AppModule,
    ArtifactsModule,
    BaseConfigurationModule,
    ConfigurationModule,
    DatabaseModule,
    GameInfoLoaderModule,
    GameInfoParserModule,
    GamesModule,
    LogModule,
    PalBrowserModule,
    PalDialogsModule,
    PalIpcModule,
    PalWorkerModule,
    UtilsModule,
  );
  return container;
}

function loadConfiguration(container: Container): AppConfigurationTree {
  return container.get(AppConfigurationLoader).loadConfiguration();
}

function createDirectoryLayout(paths: AppConfigurationTree["paths"]) {
  fs.mkdirSync(paths.user_data, { recursive: true });
  app.setPath("userData", paths.user_data);
  fs.mkdirSync(paths.blob_store, { recursive: true });
  fs.mkdirSync(paths.logs, { recursive: true });
  app.setAppLogsPath(paths.logs);
  fs.mkdirSync(paths.session_data, { recursive: true });
  app.setPath("sessionData", paths.session_data);
}

function registerCustomProtocolPriviliges(container: Container) {
  const customProtocols = container.getAll(CustomProtocolScheme);
  protocol.registerSchemesAsPrivileged(customProtocols);
}

class StartupError extends Error {
  readonly title: string;

  constructor(title: string, message: string, cause: unknown) {
    super(message, { cause });
    this.name = "StartupError";
    this.title = title;
  }
}

function wrapStartupErrors<T, TArgs extends unknown[]>(
  message: string,
  fn: (...args: TArgs) => T,
  ...args: TArgs
): T {
  if (!__CATCH_MAIN_EXCEPTIONS__ || inspector.url()) {
    return fn(...args);
  } else {
    try {
      return fn(...args);
    } catch (error) {
      throw new StartupError("MyTFGames failed to start", message, error);
    }
  }
}

if (!__CATCH_MAIN_EXCEPTIONS__ || inspector.url()) {
  run();
} else {
  try {
    run();
  } catch (error) {
    if (error instanceof StartupError) {
      const { title, message, cause } = error;
      // eslint-disable-next-line no-console
      console.error(message, cause);
      dialog.showErrorBox(title, utils.format("%s\n", message, cause));
    } else {
      // eslint-disable-next-line no-console
      console.error("Unhandled error in main process", error);
      dialog.showErrorBox(
        "MyTFGames failed to start",
        utils.format("An unknown error occurred.\n", error),
      );
    }
    app.exit(-3);
  }
}
