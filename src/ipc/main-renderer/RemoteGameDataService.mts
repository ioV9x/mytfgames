import { createAction } from "@reduxjs/toolkit";

import {
  makeRemoteProcedureDescriptor,
  makeRemoteServiceDescriptor,
} from "$ipc/core";

export type RemoteGameId = number;
export interface RemoteGame {
  id: RemoteGameId;
  name: string;
  lastUpdateTimestamp: string;
  lastCrawlTimestamp: string | null;
}

export interface RemoteGameList {
  order: RemoteGameId[];
  preloaded: RemoteGame[];
}

export enum RemoteGameOrderType {
  Id = "id",
  Name = "name",
  LastUpdate = "lastUpdate",
  LastCrawled = "lastCrawled",
}

export const remoteGameCrawled = createAction(
  "ipc/remote-game/crawled",
  (data: RemoteGame): { payload: RemoteGame } => {
    return { payload: data };
  },
);

export const remoteGameIndexUpdated = createAction<
  Record<RemoteGameOrderType, RemoteGameId[]>
>("ipc/remote-game/index-updated");

export const RemoteGameDataService = makeRemoteServiceDescriptor(
  "remote-games:data",
  {
    retrieveOrder: makeRemoteProcedureDescriptor<
      [],
      Record<RemoteGameOrderType, RemoteGameId[]>
    >(),
    retrieveGamesById: makeRemoteProcedureDescriptor<
      [ids: RemoteGameId[]],
      RemoteGame[]
    >(),
  },
);
