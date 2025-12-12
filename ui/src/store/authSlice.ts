import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UserInfo {
  id?: string;
  name?: string;
  email?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  roles: string[];
  user?: UserInfo | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  roles: [],
  user: null,
};

type SetSessionPayload = {
  roles?: string[];
  user?: UserInfo | null;
  isAuthenticated?: boolean;
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<SetSessionPayload>) => {
      const { roles, user, isAuthenticated } = action.payload;
      state.isAuthenticated = isAuthenticated ?? true;
      if (roles) state.roles = roles;
      if (user !== undefined) state.user = user;
    },
    setRoles: (state, action: PayloadAction<string[]>) => {
      state.roles = action.payload;
    },
    clearSession: (state) => {
      state.isAuthenticated = false;
      state.roles = [];
      state.user = null;
    },
  },
});

export const { setSession, setRoles, clearSession } = authSlice.actions;
export default authSlice.reducer;

