import { createAction } from "@reduxjs/toolkit";

import {
  makeRemoteProcedureDescriptor,
  makeRemoteServiceDescriptor,
} from "$ipc/core";

export interface RemoteGame {
  id: number;
  name: string;
  lastUpdateTimestamp: string;
  lastCrawlTimestamp: string | null;
}

export interface RemoteGameList {
  order: number[];
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
  Record<RemoteGameOrderType, number[]>
>("ipc/remote-game/index-updated");

export const RemoteGameDataService = makeRemoteServiceDescriptor(
  "remote-games:data",
  {
    retrieveOrder: makeRemoteProcedureDescriptor<
      [],
      Record<RemoteGameOrderType, number[]>
    >(),
    retrieveGamesById: makeRemoteProcedureDescriptor<
      [ids: number[]],
      RemoteGame[]
    >(),
  },
);
