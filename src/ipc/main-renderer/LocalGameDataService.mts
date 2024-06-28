import {
  makeRemoteProcedureDescriptor,
  makeRemoteServiceDescriptor,
} from "$ipc/core";

import type { RemoteGameId } from "./RemoteGameDataService.mjs";

export type LocalGameId = string;
export interface LocalGame {
  id: LocalGameId;
  name: string | null;
  remoteGameId?: number;
}
export interface LocalGameCreationInfo {
  name: string;
  remoteGameId?: RemoteGameId;
}

export interface LocalGameList {
  order: LocalGameId[];
  preloaded: LocalGame[];
}

export enum LocalGameOrderType {
  Id = "id",
  Name = "name",
}

export const LocalGameDataService = makeRemoteServiceDescriptor("local-games:data", {
  retrieveOrder: makeRemoteProcedureDescriptor<
    [],
    Record<LocalGameOrderType, LocalGameId[]>
  >(),
  retrieveGamesById: makeRemoteProcedureDescriptor<
    [ids: LocalGameId[]],
    LocalGame[]
  >(),

  addGame: makeRemoteProcedureDescriptor<
    [game: LocalGameCreationInfo],
    LocalGameId
  >(),
});
