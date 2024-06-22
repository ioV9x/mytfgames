import {
  makeRemoteProcedureDescriptor,
  makeRemoteServiceDescriptor,
} from "$ipc/core";

export type LocalGameId = string;
export interface LocalGame {
  id: LocalGameId;
  name: string | null;
}

export interface LocalGameList {
  order: LocalGameId[];
  preloaded: LocalGame[];
}

export enum LocalGameOrderType {
  Id = "id",
  Name = "name",
}

export const LocalGameDataService = makeRemoteServiceDescriptor(
  "local-games:data",
  {
    retrieveOrder: makeRemoteProcedureDescriptor<
      [],
      Record<LocalGameOrderType, LocalGameId[]>
    >(),
    retrieveGamesById: makeRemoteProcedureDescriptor<
      [ids: LocalGameId[]],
      LocalGame[]
    >(),
  },
);
