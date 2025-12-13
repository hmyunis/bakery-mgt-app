import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { UserRole } from "../constants/roles";

interface UserInfo {
    id?: string;
    name?: string;
    email?: string;
    avatar?: string;
    role?: UserRole;
}

export interface AuthState {
    isAuthenticated: boolean;
    roles: UserRole[];
    user?: UserInfo | null;
}

const initialState: AuthState = {
    isAuthenticated: false,
    roles: [],
    user: null,
};

type SetSessionPayload = {
    roles?: UserRole[];
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
        setRoles: (state, action: PayloadAction<UserRole[]>) => {
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
