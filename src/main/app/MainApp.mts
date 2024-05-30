import fs from "node:fs";

import { app, session } from "electron/main";
import { inject, injectable } from "inversify";

import { AppConfiguration } from "$main/configuration";
import {
  type BrowserSession,
  BrowserSessionConfigurer,
  type BrowserWindow,
  BrowserWindowFactory,
  MainIpcServer,
} from "$main/pal";

@injectable()
export class MainApp {
  session: BrowserSession | undefined;
  appWindow: BrowserWindow | undefined;

  constructor(
    @inject(BrowserSessionConfigurer)
    readonly sessionConfigurer: BrowserSessionConfigurer,
    @inject(BrowserWindowFactory) readonly windowFactory: BrowserWindowFactory,
    @inject(AppConfiguration) readonly configuration: AppConfiguration,
    @inject(MainIpcServer) readonly _ipcServer: unknown,
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
    const paths = this.configuration.root.paths;

    this.setupElectronPath("userData", paths.user_data);

    // logs path should be set via app.setAppLogsPath and is therefore special
    fs.mkdirSync(paths.logs_path, { recursive: true });
    app.setAppLogsPath(paths.logs_path);

    this.setupElectronPath("sessionData", paths.session_data);
  }
  private setupElectronPath(which: string, path: string): void {
    fs.mkdirSync(path, { recursive: true });
    app.setPath(which, path);
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
