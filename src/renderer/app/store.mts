import { configureStore } from "@reduxjs/toolkit";

import gamesReducer from "../features/games/gamesSlice.mts";

export const store = configureStore({
  reducer: {
    games: gamesReducer,
  },
  devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
