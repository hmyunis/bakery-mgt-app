import { useEffect } from "react";

/**
 * Hook to apply a theme color to CSS variables
 * Applies to both light and dark mode
 */
export function useThemeColor(color: string | undefined) {
    useEffect(() => {
        if (!color) return;

        // Validate hex color format
        if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
            console.warn(`Invalid theme color: ${color}`);
            return;
        }

        // Apply the color to CSS custom properties on the root element
        // This will override both light and dark mode accent colors
        const root = document.documentElement;
        root.style.setProperty("--accent", color);

        // Also update the style tag to ensure it persists across theme switches
        // We'll inject a high-priority style rule
        let styleEl = document.getElementById("dynamic-theme-color");
        if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = "dynamic-theme-color";
            document.head.appendChild(styleEl);
        }

        styleEl.textContent = `
            :root {
                --accent: ${color} !important;
            }
            .dark {
                --accent: ${color} !important;
            }
        `;

        // Cleanup function
        return () => {
            // Keep the color persistent - don't remove on unmount
        };
    }, [color]);
}
