import { configureStore } from "@reduxjs/toolkit";

import gamesReducer from "./games.mjs";

export const store = configureStore({
  reducer: {
    games: gamesReducer,
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
