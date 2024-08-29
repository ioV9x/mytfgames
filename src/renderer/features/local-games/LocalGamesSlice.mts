import {
  createAction,
  createAsyncThunk,
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
import { AppAsyncThunkConfig, RootState } from "$renderer/dux";
import { createSliceWithThunks } from "$renderer/dux/utils";
import {
  EntityRetrievalState,
  Page,
  paginationSlice,
  SortDirection,
  upsert,
} from "$renderer/utils";


const sliceName = "localGames";

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
>(`${sliceName}/indexUpdated`);

export const loadLocalGamesById = createAsyncThunk<
  RawLocalGame[],
  {
    localGames: typeof LocalGameDataService;
    ids: LocalGameId[];
    force?: boolean;
  },
  AppAsyncThunkConfig
>(
  `${sliceName}/loadLocalGamesById`,
  async (arg, _thunkApi) => {
    return await arg.localGames.retrieveGamesById(arg.ids);
  },
  {
    condition(arg, { getState }) {
      if (arg.force) {
        return true;
      }
      const entities = getState().localGames.entities;
      return someLocalGameNeedsLoading(entities, arg.ids);
    },
  },
);

export const paginateLocalGameIndex = createAsyncThunk<
  RawLocalGame[],
  {
    localGames: typeof LocalGameDataService;
    orderType: LocalGameOrderType;
    orderDirection: SortDirection;
    page: number;
    pageSize: number;
    force?: boolean;
  },
  AppAsyncThunkConfig
>(
  `${sliceName}/paginateLocalGameIndex`,
  async (arg, { getState, dispatch }) => {
    const games = getState().localGames;
    let order = games.order;
    if (arg.force === true || order == null) {
      order = await arg.localGames.retrieveOrder();
      dispatch(localGameIndexUpdated(order));
    }
    const selectedOrder = order[arg.orderType];
    const needed = paginationSlice(arg, selectedOrder, arg.orderDirection);
    return await dispatch(
      loadLocalGamesById({ localGames: arg.localGames, ids: needed }),
    ).unwrap();
  },
  {
    condition(arg, { getState }) {
      const games = getState().localGames;
      if (arg.force === true || games.lastError != null) {
        return true;
      }
      const order = games.order?.[arg.orderType];
      if (order == null) {
        return true;
      }

      return someLocalGameNeedsLoading(
        games.entities,
        paginationSlice(arg, order, arg.orderDirection),
      );
    },
  },
);

const localGamesSlice = createSliceWithThunks({
  name: "localGames",
  initialState,
  reducers(create) {
    return {
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

    // loadLocalGamesById
    builder.addCase(loadLocalGamesById.pending, (state, { meta }) => {
      for (const id of meta.arg.ids) {
        if (state.entities[id]?.type !== EntityRetrievalState.Loaded) {
          state.entities[id] = {
            type: EntityRetrievalState.Loading,
            id,
          };
        }
      }
    });
    builder.addCase(
      loadLocalGamesById.fulfilled,
      (state, { meta, payload }) => {
        for (const game of payload) {
          upsert(state.entities, game.id, game, {
            type: EntityRetrievalState.Loaded,
          });
        }
        for (const id of meta.arg.ids) {
          if (state.entities[id]?.type !== EntityRetrievalState.Loaded) {
            state.entities[id] = {
              type: EntityRetrievalState.Error,
              id,
              error: "Game not found",
            };
          }
        }
      },
    );
    builder.addCase(loadLocalGamesById.rejected, (state, { meta, error }) => {
      for (const id of meta.arg.ids) {
        state.entities[id] = {
          type: EntityRetrievalState.Error,
          id,
          error: error.message ?? "Unknown error",
        };
      }
    });

    // paginateLocalGameIndex
    builder.addCase(paginateLocalGameIndex.rejected, (state, { error }) => {
      state.lastError = error;
    });
  },
});

export const { createLocalGame } = localGamesSlice.actions;

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

function someLocalGameNeedsLoading(
  entities: LocalGamesState["entities"],
  ids: LocalGameId[],
): boolean {
  return ids.some((id) => {
    const game = entities[id];
    return (
      game == null ||
      (game.type !== EntityRetrievalState.Loading &&
        game.type !== EntityRetrievalState.Loaded)
    );
  });
}
