import {
  makeRemoteProcedureDescriptor,
  makeRemoteServiceDescriptor,
} from "$pure-base/ipc";

import { GameSId } from "./GameDataService.mjs";

export const ImportService = makeRemoteServiceDescriptor("import", {
  importGameInfoFromFolder: makeRemoteProcedureDescriptor<
    [artifactFolderPath: string],
    GameSId
  >(),
});
