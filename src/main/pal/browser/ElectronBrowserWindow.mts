import path from "node:path";

import {
  app,
  BrowserWindow as XElectronBrowserWindow,
  type BrowserWindowConstructorOptions,
  type WebPreferences,
} from "electron/main";
import { injectable } from "inversify";

import {
  type BrowserWindow,
  type BrowserWindowFactory,
  BrowserWindowTypeId,
} from "./BrowserWindow.mjs";

@injectable()
export class ElectronBrowserWindowFactory implements BrowserWindowFactory {
  readonly defaultWebPreferences = Object.freeze({
    preload: path.join(import.meta.dirname, "preload.js"),
  } satisfies WebPreferences);

  readonly defaultWindowOptions = Object.freeze({
    width: 1280,
    height: 720,
  } satisfies BrowserWindowConstructorOptions);

  create(): BrowserWindow {
    const nativeWindow = new XElectronBrowserWindow({
      ...this.defaultWindowOptions,
      webPreferences: {
        ...this.defaultWebPreferences,
      },
    });
    return new ElectronBrowserWindow(nativeWindow);
  }
}

@injectable()
export class ElectronBrowserWindowConfigurer {
  dereference(window: BrowserWindow): XElectronBrowserWindow {
    if (!(window instanceof ElectronBrowserWindow)) {
      throw new TypeError("Invalid browser window object");
    }
    return window.handle;
  }
}

class ElectronBrowserWindow implements BrowserWindow {
  constructor(readonly handle: XElectronBrowserWindow) {}

  get type(): typeof BrowserWindowTypeId {
    return BrowserWindowTypeId;
  }

  async loadApp(): Promise<void> {
    const appUrl =
      RENDERER_VITE_DEV_SERVER_URL && !app.isPackaged
        ? RENDERER_VITE_DEV_SERVER_URL
        : "app://renderer.invalid";
    await this.handle.loadURL(appUrl);
  }
}
