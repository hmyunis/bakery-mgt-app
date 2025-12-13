import { useEffect } from "react";
import { useAppSelector } from "../store";
import { useTheme } from "next-themes";

const accents = {
  cyan: "#06b6d4",
  emerald: "#10b981",
  violet: "#8b5cf6",
  amber: "#f59e0b",
  rose: "#f43f5e",
  blue: "#3b82f6",
};

/**
 * Hook to initialize theme from Redux store on component mount
 * Syncs with next-themes for proper dark mode class management
 */
export function useThemeInit() {
  const { mode, accent } = useAppSelector((state) => state.settings);
  const { setTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    // Sync next-themes with Redux state
    setTheme(mode);
    // Set data attribute for custom CSS
    root.dataset.theme = mode;
    // Set accent color
    root.style.setProperty("--accent", accents[accent]);
  }, [mode, accent, setTheme]);
}

