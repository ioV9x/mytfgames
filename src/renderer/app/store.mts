import { configureStore } from "@reduxjs/toolkit";

import gamesReducer from "../features/games/gamesSlice.mts";
import remoteGamesReducer from "../features/remote-games/RemoteGamesSlice.mjs";

export const store = configureStore({
  reducer: {
    games: gamesReducer,
    remoteGames: remoteGamesReducer,
  },
  devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
