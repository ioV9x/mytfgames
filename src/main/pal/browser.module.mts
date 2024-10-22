import { ContainerModule } from "inversify";

import { BrowserSessionConfigurer } from "./browser/BrowserSession.mjs";
import {
  BrowserWindowConfigurer,
  BrowserWindowFactory,
} from "./browser/BrowserWindow.mjs";
import { ElectronBrowserSessionConfigurer } from "./browser/ElectronBrowserSession.mjs";
import {
  ElectronBrowserWindowConfigurer,
  ElectronBrowserWindowFactory,
} from "./browser/ElectronBrowserWindow.mjs";

export const PalBrowserModule = new ContainerModule((bind) => {
  bind(BrowserSessionConfigurer)
    .to(ElectronBrowserSessionConfigurer)
    .inSingletonScope();
  bind(BrowserWindowFactory)
    .to(ElectronBrowserWindowFactory)
    .inSingletonScope();
  bind(BrowserWindowConfigurer)
    .to(ElectronBrowserWindowConfigurer)
    .inSingletonScope();
});
