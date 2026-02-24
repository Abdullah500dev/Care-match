import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  userData: null,
  token: null,
  tokenExpire: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action) => {
      const { user, token, tokenExpire } = action.payload;
      return {
        ...state,
        isAuthenticated: true,
        userData: user,
        token,
        tokenExpire,
      };
    },
    clearUser: () => initialState,
  },
});

export const getUser = (state) => state.auth;

export const { setUser, clearUser } = authSlice.actions;

export default authSlice.reducer;