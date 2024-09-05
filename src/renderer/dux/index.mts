import { configureStore } from "@reduxjs/toolkit";

import gameVersionsReducer from "./game-versions.mjs";
import gamesReducer from "./games.mjs";

export const store = configureStore({
  reducer: {
    games: gamesReducer,
    gameVersions: gameVersionsReducer,
  },
  devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type AppAsyncThunkConfig = {
  state: RootState;
  dispatch: AppDispatch;
};
