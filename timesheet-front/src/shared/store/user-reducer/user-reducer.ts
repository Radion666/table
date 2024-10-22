import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { AuthTokenStorageKey } from "~src/shared/constants/default";
import { UserType } from "~src/shared/types/user";

interface UserState {
  user: UserType | null;
  isLoading: boolean;
}

const initialState: UserState = {
  user: null,
  isLoading: false
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    updateAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setAuth: (state, action: PayloadAction<UserType>) => {
      state.user = action.payload;
    },
    logoutUser: (state) => {
      state.user = null;
      localStorage.removeItem(AuthTokenStorageKey);
    }
  }
});

export const { setAuth, updateAuthLoading, logoutUser } = userSlice.actions;

export default userSlice.reducer;
