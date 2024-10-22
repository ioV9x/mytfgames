import { BrowserWindow } from "$main/pal";
import { makeServiceIdentifier } from "$node-base/utils";

interface FilesystemDialogs {
  openDirectoryChooser(window?: BrowserWindow): Promise<string | null>;
}
const FilesystemDialogs =
  makeServiceIdentifier<FilesystemDialogs>("filesystem dialogs");
export { FilesystemDialogs };
