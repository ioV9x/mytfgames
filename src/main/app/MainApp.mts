import fs from "node:fs";
import path from "node:path";

import { app, session } from "electron/main";
import { inject, injectable } from "inversify";

import {
  type BrowserSession,
  BrowserSessionConfigurer,
  type BrowserWindow,
  BrowserWindowFactory,
} from "$main/pal";

@injectable()
export class MainApp {
  session: BrowserSession | undefined;
  appWindow: BrowserWindow | undefined;

  constructor(
    @inject(BrowserSessionConfigurer)
    readonly sessionConfigurer: BrowserSessionConfigurer,
    @inject(BrowserWindowFactory) readonly windowFactory: BrowserWindowFactory,
  ) {}

  async run(): Promise<void> {
    this.setupPaths();

    if (!app.requestSingleInstanceLock()) {
      app.quit();
      return;
    }

    this.initialize();

    await this.startRenderer();
  }

  setupPaths(): void {
    if (!app.isPackaged) {
      const dataPath = path.resolve("./_data");
      fs.mkdirSync(dataPath, { recursive: true });
      app.setPath("userData", dataPath);
    }

    app.setAppLogsPath();
    const sessionDataPath = path.join(app.getPath("userData"), "chromium");
    fs.mkdirSync(sessionDataPath, { recursive: true });
    app.setPath("sessionData", sessionDataPath);
  }

  initialize(): void {
    this.sessionConfigurer.registerCustomProtocolPriviliges();

    app.on("window-all-closed", this.onWindowAllClosed.bind(this));
    app.on("activate", this.onActivate.bind(this));
  }

  async startRenderer(): Promise<void> {
    await app.whenReady();

    this.session = this.sessionConfigurer.configure(session.defaultSession);
    this.appWindow = this.windowFactory.create();
    await this.appWindow.loadApp();
  }

  onWindowAllClosed() {
    // Quit when all windows are closed, except on macOS. There, it's common
    // for applications and their menu bar to stay active until the user quits
    // explicitly with Cmd + Q.
    if (process.platform !== "darwin") {
      app.quit();
    }
  }
  onActivate() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (this.appWindow == null) {
      this.appWindow = this.windowFactory.create();
      void this.appWindow.loadApp();
    }
  }
}
