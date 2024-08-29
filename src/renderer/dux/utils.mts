import { asyncThunkCreator, buildCreateSlice } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";

import type { AppDispatch, RootState } from "./index.mjs";

export interface ThunkApiConfig {
  state: RootState;
  dispatch: AppDispatch;
}

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export const createSliceWithThunks = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator },
});
