import { createAsyncThunk, SerializedError } from "@reduxjs/toolkit";

import {
  Game as RawGame,
  gameCrawled,
  gameIndexUpdated,
  GameOrderType,
  GameSearchResult,
  GameSId,
} from "$ipc/main-renderer";
import { Dictionary, SortDirection } from "$pure-base/utils";
import { AppAsyncThunkConfig, RootState } from "$renderer/dux";
import { createSliceWithThunks } from "$renderer/dux/utils";
import { EntityRetrievalState, upsert } from "$renderer/utils";

const sliceName = "games";

export interface LoadedGame extends RawGame {
  type: EntityRetrievalState.Loaded;
}

export type Game =
  | LoadedGame
  | { type: EntityRetrievalState.Loading; id: GameSId }
  | { type: EntityRetrievalState.Error; id: GameSId; error: string };

export interface GamesState {
  numGames: number;
  entities: Dictionary<GameSId, Game>;
  lastError: SerializedError | null;
}

const initialState = {
  numGames: -1,
  entities: {},
  lastError: null,
} satisfies GamesState as GamesState;

export const loadGamesById = createAsyncThunk<
  RawGame[],
  {
    ids: GameSId[];
    force?: boolean;
  },
  AppAsyncThunkConfig
>(
  `${sliceName}/loadGamesById`,
  async (arg, { extra }) => {
    return await extra.services.games.retrieveGamesById(arg.ids);
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
  GameSearchResult,
  {
    orderType: GameOrderType;
    orderDirection: SortDirection;
    page: number;
    pageSize: number;
  },
  AppAsyncThunkConfig
>(
  `${sliceName}/paginateGameIndex`,
  async (arg, { getState, dispatch, extra }) => {
    const searchResult = await extra.services.games.findGames({
      orderType: arg.orderType,
      orderDirection: arg.orderDirection,
      page: {
        no: arg.page,
        size: arg.pageSize,
      },
    });
    const { games } = getState();
    const needed = searchResult.selected.filter(
      (id) => games.entities[id]?.type !== EntityRetrievalState.Loaded,
    );
    if (needed.length > 0) {
      void dispatch(loadGamesById({ ids: needed, force: true }));
    }
    return searchResult;
  },
);

const GamesSlice = createSliceWithThunks({
  name: "Games",
  initialState,
  reducers(_create) {
    return {};
  },
  extraReducers(builder) {
    builder.addCase(gameIndexUpdated, (state, { payload }) => {
      state.numGames = payload.numGames;
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

    // gameCrawled
    builder.addCase(gameCrawled, (state, { payload }) => {
      upsert(state.entities, payload.id, payload, {
        type: EntityRetrievalState.Loaded,
      });
    });
  },
});

// export const { createGame } = GamesSlice.actions;

export function selectGameById(state: RootState, id: GameSId) {
  return state.games.entities[id];
}
export function selectLoadedGameById(state: RootState, id: GameSId) {
  return state.games.entities[id]?.type === EntityRetrievalState.Loaded
    ? state.games.entities[id]
    : undefined;
}

export function selectGames(state: RootState) {
  return state.games.entities;
}
export function selectGamesById(state: RootState, ids: GameSId[]) {
  return ids.map((id) => state.games.entities[id]);
}
export function selectLoadedGamesById(state: RootState, ids: GameSId[]) {
  return ids.map((id) => selectLoadedGameById(state, id));
}

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
