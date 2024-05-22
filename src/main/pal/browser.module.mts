import { ContainerModule } from "inversify";

import { BrowserSessionConfigurer } from "./Browser/BrowserSession.mjs";
import { BrowserWindowFactory } from "./Browser/BrowserWindow.mjs";
import { ElectronBrowserSessionConfigurer } from "./Browser/ElectronBrowserSession.mjs";
import { ElectronBrowserWindowFactory } from "./Browser/ElectronBrowserWindow.mjs";

export const PalBrowserModule = new ContainerModule((bind) => {
  bind(BrowserSessionConfigurer)
    .to(ElectronBrowserSessionConfigurer)
    .inSingletonScope();
  bind(BrowserWindowFactory)
    .to(ElectronBrowserWindowFactory)
    .inSingletonScope();
});
