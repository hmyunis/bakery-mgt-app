import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "light" | "dark";

export type AccentColor = "cyan" | "emerald" | "violet" | "amber" | "rose" | "blue";

export interface SettingsState {
    mode: ThemeMode;
    accent: AccentColor;
    language: "en" | "am";
}

const initialState: SettingsState = {
    mode: "dark",
    accent: "cyan",
    language: "en",
};

const settingsSlice = createSlice({
    name: "settings",
    initialState,
    reducers: {
        setMode: (state, action: PayloadAction<ThemeMode>) => {
            state.mode = action.payload;
        },
        toggleMode: (state) => {
            state.mode = state.mode === "dark" ? "light" : "dark";
        },
        setAccent: (state, action: PayloadAction<AccentColor>) => {
            state.accent = action.payload;
        },
        setLanguage: (state, action: PayloadAction<"en" | "am">) => {
            state.language = action.payload;
        },
    },
});

export const { setMode, toggleMode, setAccent, setLanguage } = settingsSlice.actions;

export default settingsSlice.reducer;
