import {
  createAction,
  createAsyncThunk,
  createSelector,
  SerializedError,
} from "@reduxjs/toolkit";

import {
  Game as RawGame,
  gameCrawled,
  GameDataService,
  GameOrderType,
  GameSId,
} from "$ipc/main-renderer";
import { SortDirection } from "$pure-base/utils";
import { AppAsyncThunkConfig, RootState } from "$renderer/dux";
import { createSliceWithThunks } from "$renderer/dux/utils";
import {
  EntityRetrievalState,
  Page,
  paginationSlice,
  upsert,
} from "$renderer/utils";

const sliceName = "games";

export interface LoadedGame extends RawGame {
  type: EntityRetrievalState.Loaded;
}

export type Game =
  | LoadedGame
  | { type: EntityRetrievalState.Loading; id: GameSId }
  | { type: EntityRetrievalState.Error; id: GameSId; error: string };

export interface GamesState {
  entities: Partial<Record<GameSId, Game>>;
  order: Record<GameOrderType, GameSId[]> | null;
  lastError: SerializedError | null;
}

const initialState = {
  entities: {},
  order: null,
  lastError: null,
} satisfies GamesState as GamesState;

export const GameIndexUpdated = createAction<Record<GameOrderType, GameSId[]>>(
  `${sliceName}/indexUpdated`,
);

export const loadGamesById = createAsyncThunk<
  RawGame[],
  {
    games: typeof GameDataService;
    ids: GameSId[];
    force?: boolean;
  },
  AppAsyncThunkConfig
>(
  `${sliceName}/loadGamesById`,
  async (arg, _thunkApi) => {
    return await arg.games.retrieveGamesById(arg.ids);
  },
  {
    condition(arg, { getState }) {
      if (arg.force) {
        return true;
      }
      const entities = getState().games.entities;
      return someGameNeedsLoading(entities, arg.ids);
    },
  },
);

export const paginateGameIndex = createAsyncThunk<
  RawGame[],
  {
    games: typeof GameDataService;
    orderType: GameOrderType;
    orderDirection: SortDirection;
    page: number;
    pageSize: number;
    force?: boolean;
  },
  AppAsyncThunkConfig
>(
  `${sliceName}/paginateGameIndex`,
  async (arg, { getState, dispatch }) => {
    const games = getState().games;
    let order = games.order;
    if (arg.force === true || order == null) {
      order = await arg.games.retrieveOrder();
      dispatch(GameIndexUpdated(order));
    }
    const selectedOrder = order[arg.orderType];
    const needed = paginationSlice(arg, selectedOrder, arg.orderDirection);
    return await dispatch(
      loadGamesById({ games: arg.games, ids: needed }),
    ).unwrap();
  },
  {
    condition(arg, { getState }) {
      const games = getState().games;
      if (arg.force === true || games.lastError != null) {
        return true;
      }
      const order = games.order?.[arg.orderType];
      if (order == null) {
        return true;
      }

      return someGameNeedsLoading(
        games.entities,
        paginationSlice(arg, order, arg.orderDirection),
      );
    },
  },
);

const GamesSlice = createSliceWithThunks({
  name: "Games",
  initialState,
  reducers(_create) {
    return {};
  },
  extraReducers(builder) {
    builder.addCase(GameIndexUpdated, (state, { payload }) => {
      if (state.order == null) {
        state.order = payload;
        return;
      }
      Object.assign(state.order, payload);
    });

    // loadGamesById
    builder.addCase(loadGamesById.pending, (state, { meta }) => {
      for (const id of meta.arg.ids) {
        if (state.entities[id]?.type !== EntityRetrievalState.Loaded) {
          state.entities[id] = {
            type: EntityRetrievalState.Loading,
            id,
          };
        }
      }
    });
    builder.addCase(loadGamesById.fulfilled, (state, { meta, payload }) => {
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
    });
    builder.addCase(loadGamesById.rejected, (state, { meta, error }) => {
      for (const id of meta.arg.ids) {
        state.entities[id] = {
          type: EntityRetrievalState.Error,
          id,
          error: error.message ?? "Unknown error",
        };
      }
    });

    // paginateGameIndex
    builder.addCase(paginateGameIndex.rejected, (state, { error }) => {
      state.lastError = error;
    });

    // gameCrawled
    builder.addCase(gameCrawled, (state, { payload }) => {
      upsert(state.entities, payload.id, payload, {
        type: EntityRetrievalState.Loaded,
      });
    });
  },
});

// export const { createGame } = GamesSlice.actions;

export const selectGames = (state: RootState) => state.games.entities;

export interface GamePage extends Page {
  orderType: GameOrderType;
  orderDirection: SortDirection;
}
const emptyArray: readonly [] = Object.freeze([]);
export const selectGamePage = createSelector(
  selectGames,
  (_state: RootState, { page }: GamePage) => page,
  (_state: RootState, { pageSize }: GamePage) => pageSize,
  (_state: RootState, { orderDirection }: GamePage) => orderDirection,
  (state: RootState, { orderType }: GamePage) =>
    state.games.order?.[orderType] ?? emptyArray,
  (entities, page, pageSize, orderDirection, order) =>
    paginationSlice({ page, pageSize }, order, orderDirection).map(
      (id) => entities[id],
    ),
);

export default GamesSlice.reducer;

function someGameNeedsLoading(
  entities: GamesState["entities"],
  ids: GameSId[],
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
