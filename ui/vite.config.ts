import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const stampServiceWorker = () => ({
    name: "stamp-service-worker",
    apply: "build" as const,
    closeBundle() {
        const workerPath = fileURLToPath(new URL("./dist/sw.js", import.meta.url));
        const indexPath = fileURLToPath(new URL("./dist/index.html", import.meta.url));
        const index = readFileSync(indexPath, "utf8");
        const assets = [...index.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(([, asset]) =>
            JSON.stringify(asset)
        );
        const source = readFileSync(workerPath, "utf8");
        if (!source.includes("__BUILD_ID__") || !source.includes("__PRECACHE_ASSETS__")) {
            throw new Error("Service worker build placeholders are missing.");
        }
        writeFileSync(
            workerPath,
            source
                .replace("__BUILD_ID__", new Date().toISOString())
                .replace('"__PRECACHE_ASSETS__"', assets.join(",\n    "))
        );
    },
});

// https://vite.dev/config/
export default defineConfig(() => ({
    plugins: [react(), tailwindcss(), stampServiceWorker()],
    build: {
        emptyOutDir: true,
    },
}));
