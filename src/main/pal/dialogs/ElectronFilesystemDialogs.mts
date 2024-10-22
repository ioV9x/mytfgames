import {
  BrowserWindow as XElectronBrowserWindow,
  dialog,
  webContents,
} from "electron/main";
import { inject, injectable } from "inversify";

import { ArtifactService } from "$ipc/main-renderer";
import { BrowserWindow, BrowserWindowConfigurer } from "$main/pal";
import { MessageTransport, remoteProcedure } from "$pure-base/ipc";

import { ElectronMainMessageTransport } from "../Ipc/MainMessageTransport.mjs";
import { FilesystemDialogs } from "./FilesystemDialogs.mjs";

@injectable()
export class ElectronFilesystemDialogs implements FilesystemDialogs {
  constructor(
    @inject(BrowserWindowConfigurer)
    private readonly windowConfigurer: BrowserWindowConfigurer,
  ) {}

  async openDirectoryChooser(window?: BrowserWindow): Promise<string | null> {
    return this.#openDirectoryChooser(
      window ? this.windowConfigurer.dereference(window) : undefined,
    );
  }

  @remoteProcedure(ArtifactService, "openDirectoryChooser")
  async remoteOpenDirectoryChooser(
    target: MessageTransport,
  ): Promise<string | null> {
    if (!(target instanceof ElectronMainMessageTransport)) {
      throw new TypeError("Invalid message transport");
    }
    const webCtx = webContents.fromId(target.webContentsId);
    if (webCtx == null) {
      throw new TypeError("Invalid web contents ID");
    }
    const window = XElectronBrowserWindow.fromWebContents(webCtx);
    if (window == null) {
      throw new TypeError("Invalid web contents object");
    }
    return this.#openDirectoryChooser(window);
  }

  async #openDirectoryChooser(
    window?: XElectronBrowserWindow,
  ): Promise<string | null> {
    const options = {
      title: "Select a directory",
      properties: ["openDirectory"],
    } satisfies Electron.OpenDialogOptions;
    const result = await (window
      ? dialog.showOpenDialog(window, options)
      : dialog.showOpenDialog(options));
    return result.canceled ? null : result.filePaths[0]!;
  }
}
