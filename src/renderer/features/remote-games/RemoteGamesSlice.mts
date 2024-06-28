import { createSelector, SerializedError } from "@reduxjs/toolkit";

import {
  RemoteGame as RawRemoteGame,
  remoteGameCrawled,
  RemoteGameDataService,
  RemoteGameId,
  remoteGameIndexUpdated,
  RemoteGameOrderType,
} from "$ipc/main-renderer";
import {
  createSliceWithThunks,
  EntityRetrievalState,
  Page,
  paginationSlice,
  SortDirection,
  upsert,
} from "$renderer/utils";

import { RootState } from "../../app/store.mts";

export interface LoadedRemoteGame extends RawRemoteGame {
  type: EntityRetrievalState.Loaded;
}

export type RemoteGame =
  | LoadedRemoteGame
  | { type: EntityRetrievalState.Loading; id: RemoteGameId }
  | { type: EntityRetrievalState.Error; id: RemoteGameId; error: string };

export interface RemoteGamesState {
  entities: Partial<Record<RemoteGameId, RemoteGame>>;
  order: Record<RemoteGameOrderType, RemoteGameId[]> | null;
  lastError: SerializedError | null;
}

const initialState = {
  entities: {},
  order: null,
  lastError: null,
} satisfies RemoteGamesState as RemoteGamesState;

const remoteGamesSlice = createSliceWithThunks({
  name: "remoteGames",
  initialState,
  reducers(create) {
    return {
      paginateRemoteGameIndex: create.asyncThunk<
        RawRemoteGame[],
        {
          remoteGames: typeof RemoteGameDataService;
          orderType: RemoteGameOrderType;
          orderDirection: SortDirection;
          page: number;
          pageSize: number;
          force: boolean;
        }
      >(
        async (arg, thunkApi) => {
          const games =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
            (thunkApi.getState() as any).remoteGames as RemoteGamesState;
          let order = games.order;
          if (arg.force || order == null) {
            order = await arg.remoteGames.retrieveOrder();
            thunkApi.dispatch(remoteGameIndexUpdated(order));
          }
          const selectedOrder = order[arg.orderType];
          const needed = paginationSlice(
            arg,
            selectedOrder,
            arg.orderDirection,
          );
          const loaded = await arg.remoteGames.retrieveGamesById(needed);
          return loaded;
        },
        {
          pending(state, _action) {
            const order = state.order?.[_action.meta.arg.orderType];
            if (order != null) {
              for (const id of paginationSlice(
                _action.meta.arg,
                order,
                _action.meta.arg.orderDirection,
              )) {
                if (state.entities[id]?.type !== EntityRetrievalState.Loaded) {
                  state.entities[id] = {
                    type: EntityRetrievalState.Loading,
                    id,
                  };
                }
              }
            }
          },
          fulfilled(state, action) {
            for (const game of action.payload) {
              upsert(state.entities, game.id, game, {
                type: EntityRetrievalState.Loaded,
              });
            }
          },
          rejected(state, action) {
            state.lastError = action.error;
          },
          options: {
            condition(arg, { getState }) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
              const games = (getState() as any).remoteGames as RemoteGamesState;
              if (arg.force || games.lastError != null) {
                return true;
              }
              const order = games.order?.[arg.orderType];
              if (order == null) {
                return true;
              }

              return paginationSlice(arg, order, arg.orderDirection).some(
                (id) => {
                  const game = games.entities[id];
                  return (
                    game == null ||
                    (game.type !== EntityRetrievalState.Loading &&
                      game.type !== EntityRetrievalState.Loaded)
                  );
                },
              );
            },
          },
        },
      ),
      loadRemoteGamesById: create.asyncThunk<
        RawRemoteGame[],
        { remoteGames: typeof RemoteGameDataService; ids: RemoteGameId[] }
      >(
        async (arg, _thunkApi) => {
          const games = await arg.remoteGames.retrieveGamesById(arg.ids);
          if (games.length !== arg.ids.length) {
            throw new Error(`A requested game was not found`);
          }
          return games;
        },
        {
          pending(state, action) {
            const ids = action.meta.arg.ids;
            for (const id of ids) {
              if (state.entities[id]?.type !== EntityRetrievalState.Loaded) {
                state.entities[id] = {
                  type: EntityRetrievalState.Loading,
                  id,
                };
              }
            }
          },
          fulfilled(state, action) {
            const games = action.payload;
            for (const game of games) {
              upsert(state.entities, game.id, game, {
                type: EntityRetrievalState.Loaded,
              });
            }
          },
          options: {
            condition(arg, { getState }) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
              const games = (getState() as any).remoteGames as RemoteGamesState;
              return arg.ids.some(
                (id) =>
                  games.entities[id]?.type !== EntityRetrievalState.Loaded,
              );
            },
          },
        },
      ),
    };
  },
  extraReducers(builder) {
    builder.addCase(remoteGameCrawled, (state, { payload }) => {
      const entity = state.entities[payload.id];
      if (entity?.type !== EntityRetrievalState.Loaded) {
        // not loaded => create a new entity object
        state.entities[payload.id] = {
          ...payload,
          type: EntityRetrievalState.Loaded,
        };
      } else if (
        (entity.lastCrawlTimestamp ?? "") < (payload.lastCrawlTimestamp ?? "")
      ) {
        // loaded but outdated => update the entity object
        Object.assign(entity, payload);
      }
      // else: loaded and up-to-date => do nothing
    });
    builder.addCase(remoteGameIndexUpdated, (state, { payload }) => {
      if (state.order == null) {
        state.order = payload;
        return;
      }
      Object.assign(state.order, payload);
    });
  },
});

export const { paginateRemoteGameIndex, loadRemoteGamesById } =
  remoteGamesSlice.actions;

export const selectRemoteGames = (state: RootState) =>
  state.remoteGames.entities;

export const selectRemoteGameById = (state: RootState, id: RemoteGameId) =>
  state.remoteGames.entities[id];
export const selectRemoteGamesById = createSelector(
  selectRemoteGames,
  (_state: RootState, ids: RemoteGameId[]) => ids,
  (entities, ids) => ids.map((id) => entities[id]),
);

export interface RemoteGamePage extends Page {
  orderType: RemoteGameOrderType;
  orderDirection: SortDirection;
}
const emptyArray: readonly [] = Object.freeze([]);
export const selectRemoteGamePage = createSelector(
  selectRemoteGames,
  (_state: RootState, { page }: RemoteGamePage) => page,
  (_state: RootState, { pageSize }: RemoteGamePage) => pageSize,
  (_state: RootState, { orderDirection }: RemoteGamePage) => orderDirection,
  (state: RootState, { orderType }: RemoteGamePage) =>
    state.remoteGames.order?.[orderType] ?? emptyArray,
  (entities, page, pageSize, orderDirection, order) =>
    paginationSlice({ page, pageSize }, order, orderDirection).map(
      (id) => entities[id],
    ),
);

export default remoteGamesSlice.reducer;
