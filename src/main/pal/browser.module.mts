import { ContainerModule } from "inversify";

import { BrowserSessionConfigurer } from "./browser/BrowserSession.mjs";
import { BrowserWindowFactory } from "./browser/BrowserWindow.mjs";
import { ElectronBrowserSessionConfigurer } from "./browser/ElectronBrowserSession.mjs";
import { ElectronBrowserWindowFactory } from "./browser/ElectronBrowserWindow.mjs";

export const PalBrowserModule = new ContainerModule((bind) => {
  bind(BrowserSessionConfigurer)
    .to(ElectronBrowserSessionConfigurer)
    .inSingletonScope();
  bind(BrowserWindowFactory)
    .to(ElectronBrowserWindowFactory)
    .inSingletonScope();
});
