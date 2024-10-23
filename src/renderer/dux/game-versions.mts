import { SerializedError } from "@reduxjs/toolkit";

import {
  ArtifactPlatform,
  GameSId,
  GameVersion,
  GameVersionService,
} from "$ipc/main-renderer";

import { RootState } from "./index.mts";
import { createAppSelector, createSliceWithThunks } from "./utils.mts";

const sliceName = "GameVersions";

export interface GameVersionsState {
  platforms: ArtifactPlatform[];
  entities: Partial<Record<GameSId, GameVersion[]>>;
  lastError: SerializedError | null;
}

const initialState = {
  platforms: [],
  entities: {},
  lastError: null,
} satisfies GameVersionsState as GameVersionsState;

const GameVersionsSlice = createSliceWithThunks({
  name: sliceName,
  initialState,
  reducers(create) {
    return {
      loadArtifactPlatforms: create.asyncThunk<
        ArtifactPlatform[],
        { gameVersions: typeof GameVersionService }
      >(async ({ gameVersions }) => gameVersions.getArtifactPlatforms(), {
        fulfilled(state, action) {
          state.platforms = action.payload;
        },
      }),
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

export const { loadArtifactPlatforms, loadGameVersionsForGame } =
  GameVersionsSlice.actions;

export const selectArtifactPlatforms = (state: RootState) =>
  state.gameVersions.platforms;

export const selectGameVersions = (state: RootState) =>
  state.gameVersions.entities;

export const selectGameVersionsForGame = createAppSelector(
  selectGameVersions,
  (_state: RootState, p: { gameId: GameSId }) => p.gameId,
  (gameVersions, gameId) => gameVersions[gameId],
);

export default GameVersionsSlice.reducer;
