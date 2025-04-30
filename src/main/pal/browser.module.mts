import { ContainerModule } from "inversify";

import {
  BrowserSessionConfigurer,
  CustomProtocolScheme,
} from "./browser/BrowserSession.mjs";
import {
  BrowserWindowConfigurer,
  BrowserWindowFactory,
} from "./browser/BrowserWindow.mjs";
import { ElectronBrowserSessionConfigurer } from "./browser/ElectronBrowserSession.mjs";
import {
  ElectronBrowserWindowConfigurer,
  ElectronBrowserWindowFactory,
} from "./browser/ElectronBrowserWindow.mjs";

export const PalBrowserModule = new ContainerModule(({ bind }) => {
  bind(BrowserSessionConfigurer)
    .to(ElectronBrowserSessionConfigurer)
    .inSingletonScope();
  bind(BrowserWindowFactory)
    .to(ElectronBrowserWindowFactory)
    .inSingletonScope();
  bind(BrowserWindowConfigurer)
    .to(ElectronBrowserWindowConfigurer)
    .inSingletonScope();

  bind(CustomProtocolScheme).toConstantValue({
    scheme: "app",
    privileges: {
      standard: true,
      codeCache: true,
      secure: true,
      stream: true,
      supportFetchAPI: true,
    },
  });
  bind(CustomProtocolScheme).toConstantValue({
    scheme: "game",
    privileges: {
      standard: true,
      secure: true,
      stream: true,
      supportFetchAPI: true,
      allowServiceWorkers: false,
      corsEnabled: true,
    },
  });
});
