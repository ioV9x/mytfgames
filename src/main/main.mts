/// <reference types="vite/client" />
import "reflect-metadata/lite";

import { app } from "electron";
import { Container } from "inversify";

import { MainApp } from "$main/app";
import { makeServiceIdentifier } from "$main/utils";

import { AppModule } from "./app/app.module.mjs";
import { PalBrowserModule } from "./pal/browser.module.mjs";

const container = new Container();
container.load(
  // keep this list sorted
  AppModule,
  PalBrowserModule,
);

const mainAppTypeId = makeServiceIdentifier<MainApp>("main app");
container.bind(mainAppTypeId).to(MainApp).inSingletonScope();
const mainApp = (globalThis.main = container.get(mainAppTypeId));

mainApp.run().catch((error: unknown) => {
  console.error(`MainApp.run() failed`, error);
  app.exit(-1);
});
