import { ContainerModule } from "inversify";

import { IpcServiceProvider } from "$node-base/ipc";

import { ElectronFilesystemDialogs } from "./dialogs/ElectronFilesystemDialogs.mjs";
import { FilesystemDialogs } from "./index.mjs";

export const PalDialogsModule = new ContainerModule((bind) => {
  bind(ElectronFilesystemDialogs).toSelf().inSingletonScope();
  bind(FilesystemDialogs).toService(ElectronFilesystemDialogs);
  bind(IpcServiceProvider).toService(ElectronFilesystemDialogs);
});
