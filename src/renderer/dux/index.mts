import { configureStore } from "@reduxjs/toolkit";

import gameVersionsReducer from "./game-versions.mjs";
import gamesReducer from "./games.mjs";
import { IThunkExtra, thunkExtra } from "./thunk-extra.mts";

export const store = configureStore({
  reducer: {
    games: gamesReducer,
    gameVersions: gameVersionsReducer,
  },
  devTools: true,
  middleware(getDefaultMiddleware) {
    return getDefaultMiddleware({
      thunk: { extraArgument: thunkExtra },
    });
  },
});

type StoreType = typeof store;

export type RootState = ReturnType<StoreType["getState"]>;
export type AppDispatch = StoreType["dispatch"];

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type AppAsyncThunkConfig = {
  state: RootState;
  dispatch: AppDispatch;
  extra: IThunkExtra;
};
