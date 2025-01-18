/// <reference types="vite/client" />
import "reflect-metadata/lite";

import { app } from "electron";
import { Container } from "inversify";

import { GameInfoLoaderModule } from "$game-info/loader/loader.module.mjs";
import { GameInfoParserModule } from "$game-info/parser/parser.module.mjs";
import { MainApp } from "$main/app";
import { AppConfigurationLoader } from "$main/configuration";
import { AppConfigurationTree } from "$node-base/configuration";
import { BaseConfigurationModule } from "$node-base/configuration/configuration.module.mjs";
import { DatabaseModule } from "$node-base/database/database.module.mjs";
import { makeServiceIdentifier } from "$node-base/utils";
import { UtilsModule } from "$node-base/utils/utils.module.mjs";

import { AppModule } from "./app/app.module.mjs";
import { ArtifactsModule } from "./artifacts/artifacts.module.mjs";
import { ConfigurationModule } from "./configuration/configuration.module.mjs";
import { GamesModule } from "./games/games.module.mjs";
import { LogModule } from "./log/log.module.mjs";
import { PalBrowserModule } from "./pal/browser.module.mjs";
import { PalDialogsModule } from "./pal/dialogs.module.mjs";
import { PalIpcModule } from "./pal/Ipc/IpcModule.mjs";
import { PalWorkerModule } from "./pal/worker/worker.module.mjs";

const container = new Container({
  skipBaseClassChecks: true,
});
container.load(
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

// load configuration
const configuration = container.get(AppConfigurationLoader).loadConfiguration();
container.bind(AppConfigurationTree).toConstantValue(configuration);

// instantiate main app
const mainAppTypeId = makeServiceIdentifier<MainApp>("main app");
container.bind(mainAppTypeId).to(MainApp).inSingletonScope();
// assign to global for debugging
// eslint-disable-next-line @typescript-eslint/no-deprecated
const mainApp = (globalThis.main = container.get(mainAppTypeId));

mainApp.run().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(`MainApp.run() failed`, error);
  app.exit(-1);
});
