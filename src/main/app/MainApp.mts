import fs from "node:fs";

import { app, session } from "electron/main";
import installExtension, { REDUX_DEVTOOLS } from "electron-devtools-installer";
import { inject, injectable } from "inversify";

import { Logger, logger } from "$main/log";
import {
  type BrowserSession,
  BrowserSessionConfigurer,
  type BrowserWindow,
  BrowserWindowFactory,
  MainIpcServer,
} from "$main/pal";
import { AppConfiguration } from "$node-base/configuration";

import { migrate } from "../database/KyselyMigrationProvider.mjs";
import { WorkerShim } from "../pal/worker/Worker.mjs";
import { JobSchedulingService } from "./JobSchedulingService.mjs";

@injectable()
export class MainApp {
  session: BrowserSession | undefined;
  appWindow: BrowserWindow | undefined;

  constructor(
    @logger("app") public readonly log: Logger,
    @inject(BrowserSessionConfigurer)
    readonly sessionConfigurer: BrowserSessionConfigurer,
    @inject(BrowserWindowFactory) readonly windowFactory: BrowserWindowFactory,
    @inject(JobSchedulingService)
    readonly jobSchedulingService: JobSchedulingService,
    @inject(AppConfiguration) readonly configuration: AppConfiguration,
    @inject(MainIpcServer) readonly _ipcServer: unknown,
    @inject(WorkerShim) readonly workerShim: WorkerShim,
  ) {
    this.log.info("<===================== My TFGames =====================>");
  }

  async run(): Promise<void> {
    this.setupPaths();

    if (!app.requestSingleInstanceLock()) {
      app.quit();
      return;
    }

    this.initialize();

    // apply migrations before starting the renderer in order to avoid DB access
    await migrate(this.configuration.root.paths.database);
    // start the worker before the renderer, but after the migrations as the
    // worker will open a database connection on startup
    await this.workerShim.start();

    await this.startRenderer();
  }

  setupPaths(): void {
    const paths = this.configuration.root.paths;

    this.setupElectronPath("userData", paths.user_data);

    // logs path should be set via app.setAppLogsPath and is therefore special
    fs.mkdirSync(paths.logs, { recursive: true });
    app.setAppLogsPath(paths.logs);

    this.setupElectronPath("sessionData", paths.session_data);

    fs.mkdirSync(paths.blob_store, { recursive: true });
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
    void this.jobSchedulingService.tick();
    setInterval(
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.jobSchedulingService.tick.bind(this.jobSchedulingService),
      this.jobSchedulingService.tickInterval.total({ unit: "milliseconds" }),
    );
    if (!app.isPackaged) {
      await installExtension([REDUX_DEVTOOLS], {
        loadExtensionOptions: {
          allowFileAccess: true,
        },
      });
    }

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
