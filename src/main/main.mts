/// <reference types="vite/client" />
import "reflect-metadata/lite";

import { app } from "electron";
import { Container } from "inversify";

import { MainApp } from "$main/app";
import {
  AppConfigurationLoader,
  AppConfigurationTree,
} from "$main/configuration";
import { makeServiceIdentifier } from "$node-libs/utils";

import { ApiModule } from "./api/api.module.mjs";
import { AppModule } from "./app/app.module.mjs";
import { ConfigurationModule } from "./configuration/configuration.module.mjs";
import { DatabaseModule } from "./database/database.module.mjs";
import { GamesModule } from "./games/games.module.mjs";
import { LogModule } from "./log/log.module.mjs";
import { PalBrowserModule } from "./pal/browser.module.mjs";
import { PalIpcModule } from "./pal/Ipc/IpcModule.mjs";

const container = new Container();
container.load(
  // keep this list sorted
  ApiModule,
  AppModule,
  ConfigurationModule,
  DatabaseModule,
  GamesModule,
  LogModule,
  PalBrowserModule,
  PalIpcModule,
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
