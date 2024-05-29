import { createSelector } from "@reduxjs/toolkit";

import type { GameInfo, GameInfoService } from "$ipc/main-renderer";
import { createSliceWithThunks } from "$renderer/utils";

import { RootState } from "../../app/store.mts";

export interface GamesState {
  games: Record<string, GameInfo>;
  status: "uninitialized" | "loading" | "loaded" | "error";
  error?: string | undefined;
}

const initialState: GamesState = {
  games: {},
  status: "uninitialized",
};

export const gamesSlice = createSliceWithThunks({
  name: "games",
  initialState,
  reducers(create) {
    return {
      loadGamesFromMain: create.asyncThunk<
        GameInfo[],
        { gameInfo: typeof GameInfoService }
      >(
        async (arg, _thunkApi) => {
          return await arg.gameInfo.getGames();
        },
        {
          pending(state, _action) {
            state.status = "loading";
          },
          fulfilled(state, action) {
            state.status = "loaded";
            state.games = Object.fromEntries(
              action.payload.map((game, idx) => [
                idx.toString(),
                { ...game, id: idx.toString() },
              ]),
            );
          },
          rejected(state, action) {
            state.status = "error";
            state.error = action.error.message;
          },
          options: {
            condition(_arg, { getState }) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
              const { status } = (getState() as any).games as GamesState;
              return status !== "loading";
            },
          },
        },
      ),
    };
  },
});

export const { loadGamesFromMain } = gamesSlice.actions;

export const selectGames = (state: RootState) => state.games.games;
export const selectGameList = createSelector(selectGames, (games) =>
  Object.values(games),
);

export default gamesSlice.reducer;
