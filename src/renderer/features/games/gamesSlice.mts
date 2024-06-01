import { createSelector, SerializedError } from "@reduxjs/toolkit";

import {
  GameInfo,
  GameInfoService,
  GameList,
  GameOrderType,
} from "$ipc/main-renderer";
import { createSliceWithThunks } from "$renderer/utils";

import { RootState } from "../../app/store.mts";

export enum EntityRetrievalState {
  Loading = "loading",
  Loaded = "loaded",
  Error = "error",
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type LoadedGameInfo = {
  type: EntityRetrievalState.Loaded;
  id: string;
  tfgamesId?: number | undefined;
  name: string;
  lastUpdate: string;
};
export type XGameInfo =
  | { type: EntityRetrievalState.Loading; id: string }
  | LoadedGameInfo
  | { type: EntityRetrievalState.Error; id: string; error: string };

export interface GamesState {
  entities: Partial<Record<string, XGameInfo>>;
  order: Partial<Record<GameOrderType, string[]>>;
  lastError: SerializedError | null;
}

const initialState = {
  entities: {},
  order: {},
  lastError: null,
} satisfies GamesState as GamesState;

function paginationSlice<T>(
  { page, pageSize }: { page: number; pageSize: number },
  items: readonly T[],
) {
  const offset = (page - 1) * pageSize;
  return items.slice(offset, offset + pageSize);
}
function upsert<T extends object, TUpdates extends Partial<T>[]>(
  record: Partial<Record<string, T>>,
  id: string,
  ...updates: TUpdates
) {
  let current = record[id];
  if (current == null) {
    current = record[id] = Object.create(null) as T;
  }
  Object.assign(current, ...updates);
}

export const gamesSlice = createSliceWithThunks({
  name: "games",
  initialState,
  reducers(create) {
    return {
      loadGameList: create.asyncThunk<
        {
          order?: string[];
          preloaded: GameInfo[];
        },
        {
          gameInfo: typeof GameInfoService;
          orderType: GameOrderType;
          page: number;
          pageSize: number;
          force: boolean;
        }
      >(
        async (arg, thunkApi) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          const games = (thunkApi.getState() as any).games as GamesState;
          const order = games.order[arg.orderType];
          if (arg.force || order == null) {
            return await arg.gameInfo.getGameList(
              arg.orderType,
              arg.page,
              arg.pageSize,
              arg.force,
            );
          } else {
            const needed = paginationSlice(arg, order);
            const loaded = await arg.gameInfo.getGames(needed);
            return {
              preloaded: loaded,
            };
          }
        },
        {
          pending(state, _action) {
            const order = state.order[_action.meta.arg.orderType];
            if (order != null) {
              for (const id of paginationSlice(_action.meta.arg, order)) {
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
            if (action.payload.order != null) {
              state.order[action.meta.arg.orderType] = action.payload.order;
            }

            for (const game of action.payload.preloaded) {
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
              const games = (getState() as any).games as GamesState;
              if (arg.force || games.lastError != null) {
                return true;
              }
              const order = games.order[arg.orderType];
              if (order == null) {
                return true;
              }

              const offset = (arg.page - 1) * arg.pageSize;
              const end = offset + arg.pageSize;
              return order.slice(offset, end).some((id) => {
                const game = games.entities[id];
                return (
                  game == null ||
                  (game.type !== EntityRetrievalState.Loading &&
                    game.type !== EntityRetrievalState.Loaded)
                );
              });
            },
          },
        },
      ),
      loadGamesByIDs: create.asyncThunk<
        GameInfo[],
        { gameInfo: typeof GameInfoService; ids: string[] }
      >(
        async (arg, _thunkApi) => {
          return await arg.gameInfo.getGames(arg.ids);
        },
        {
          pending(state, action) {
            for (const id of action.meta.arg.ids) {
              if (state.entities[id]?.type !== EntityRetrievalState.Loaded) {
                state.entities[id] = {
                  type: EntityRetrievalState.Loading,
                  id,
                };
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
            condition(arg, api) {
              const { entities } = api.getState() as GamesState;
              return arg.ids.some(
                (id) => entities[id]?.type !== EntityRetrievalState.Loaded,
              );
            },
          },
        },
      ),
    };
  },
});

export const { loadGameList, loadGamesByIDs } = gamesSlice.actions;

export const selectGames = (state: RootState) => state.games.entities;

interface GamePaginationSettings {
  page: number;
  pageSize: number;
  orderType: GameOrderType;
}
const emptyArray: readonly string[] = Object.freeze([]);
export const selectPaginatedGameList = createSelector(
  selectGames,
  (_state: RootState, { page }: GamePaginationSettings) => page,
  (_state: RootState, { pageSize }: GamePaginationSettings) => pageSize,
  (state: RootState, { orderType }: GamePaginationSettings) =>
    state.games.order[orderType] ?? emptyArray,
  (entities, page, pageSize, orderType) =>
    paginationSlice({ page, pageSize }, orderType).map((id) => entities[id]),
);

export default gamesSlice.reducer;
