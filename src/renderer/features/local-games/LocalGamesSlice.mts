import {
  createAction,
  createSelector,
  SerializedError,
} from "@reduxjs/toolkit";

import {
  LocalGame as RawLocalGame,
  LocalGameCreationInfo,
  LocalGameDataService,
  LocalGameId,
  LocalGameOrderType,
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

export interface LoadedLocalGame extends RawLocalGame {
  type: EntityRetrievalState.Loaded;
}

export type LocalGame =
  | LoadedLocalGame
  | { type: EntityRetrievalState.Loading; id: LocalGameId }
  | { type: EntityRetrievalState.Error; id: LocalGameId; error: string };

export interface LocalGamesState {
  entities: Partial<Record<LocalGameId, LocalGame>>;
  order: Record<LocalGameOrderType, LocalGameId[]> | null;
  lastError: SerializedError | null;
}

const initialState = {
  entities: {},
  order: null,
  lastError: null,
} satisfies LocalGamesState as LocalGamesState;

export const localGameIndexUpdated = createAction<
  Record<LocalGameOrderType, LocalGameId[]>
>("localGames/index-updated");

const localGamesSlice = createSliceWithThunks({
  name: "localGames",
  initialState,
  reducers(create) {
    return {
      paginateLocalGameIndex: create.asyncThunk<
        RawLocalGame[],
        {
          localGames: typeof LocalGameDataService;
          orderType: LocalGameOrderType;
          orderDirection: "ASC" | "DESC";
          page: number;
          pageSize: number;
          force: boolean;
        }
      >(
        async (arg, thunkApi) => {
          const games =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
            (thunkApi.getState() as any).localGames as LocalGamesState;
          let order = games.order;
          if (arg.force || order == null) {
            order = await arg.localGames.retrieveOrder();
            thunkApi.dispatch(localGameIndexUpdated(order));
          }
          const selectedOrder = order[arg.orderType];
          const needed = paginationSlice(
            arg,
            selectedOrder,
            arg.orderDirection,
          );
          const loaded = await arg.localGames.retrieveGamesById(needed);
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
              const games = (getState() as any).localGames as LocalGamesState;
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
      createLocalGame: create.asyncThunk<
        LocalGameId,
        {
          localGames: typeof LocalGameDataService;
          game: LocalGameCreationInfo;
        }
      >(
        async (arg, _thunkApi) => {
          const id = await arg.localGames.addGame(arg.game);
          return id;
        },
        {
          fulfilled(state, action) {
            const game: LoadedLocalGame = {
              type: EntityRetrievalState.Loaded,
              id: action.payload,
              name: action.meta.arg.game.name,
            };
            if (action.meta.arg.game.remoteGameId != null) {
              game.remoteGameId = action.meta.arg.game.remoteGameId;
            }
            state.entities[action.payload] = game;
            state.order = null;
          },
        },
      ),
    };
  },
  extraReducers(builder) {
    builder.addCase(localGameIndexUpdated, (state, { payload }) => {
      if (state.order == null) {
        state.order = payload;
        return;
      }
      Object.assign(state.order, payload);
    });
  },
});

export const { createLocalGame, paginateLocalGameIndex } =
  localGamesSlice.actions;

export const selectLocalGames = (state: RootState) => state.localGames.entities;

export interface LocalGamePage extends Page {
  orderType: LocalGameOrderType;
  orderDirection: SortDirection;
}
const emptyArray: readonly [] = Object.freeze([]);
export const selectLocalGamePage = createSelector(
  selectLocalGames,
  (_state: RootState, { page }: LocalGamePage) => page,
  (_state: RootState, { pageSize }: LocalGamePage) => pageSize,
  (_state: RootState, { orderDirection }: LocalGamePage) => orderDirection,
  (state: RootState, { orderType }: LocalGamePage) =>
    state.localGames.order?.[orderType] ?? emptyArray,
  (entities, page, pageSize, orderDirection, order) =>
    paginationSlice({ page, pageSize }, order, orderDirection).map(
      (id) => entities[id],
    ),
);

export default localGamesSlice.reducer;
