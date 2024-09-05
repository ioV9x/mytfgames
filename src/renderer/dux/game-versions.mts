import { SerializedError } from "@reduxjs/toolkit";

import { GameSId, GameVersion, GameVersionService } from "$ipc/main-renderer";

import { RootState } from "./index.mts";
import { createAppSelector, createSliceWithThunks } from "./utils.mts";

const sliceName = "GameVersions";

export interface GameVersionsState {
  entities: Partial<Record<GameSId, GameVersion[]>>;
  lastError: SerializedError | null;
}

const initialState = {
  entities: {},
  lastError: null,
} satisfies GameVersionsState as GameVersionsState;

const GameVersionsSlice = createSliceWithThunks({
  name: sliceName,
  initialState,
  reducers(create) {
    return {
      loadGameVersionsForGame: create.asyncThunk<
        GameVersion[],
        { gameId: GameSId; gameVersions: typeof GameVersionService }
      >(
        ({ gameId, gameVersions }) =>
          gameVersions.retrieveVersionsForGame(gameId),
        {
          fulfilled(state, action) {
            const { gameId } = action.meta.arg;
            state.entities[gameId] = action.payload;
          },
        },
      ),
    };
  },
});

export const { loadGameVersionsForGame } = GameVersionsSlice.actions;

export const selectGameVersions = (state: RootState) =>
  state.gameVersions.entities;

export const selectGameVersionsForGame = createAppSelector(
  selectGameVersions,
  (_state: RootState, p: { gameId: GameSId }) => p.gameId,
  (gameVersions, gameId) => gameVersions[gameId],
);

export default GameVersionsSlice.reducer;
