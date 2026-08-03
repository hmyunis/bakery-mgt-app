import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider } from "next-themes";
import { Provider } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistGate } from "redux-persist/integration/react";
import { Toaster } from "sonner";
import { persistor, store } from "./store";
import { queryClient } from "./lib/queryClient";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <QueryClientProvider client={queryClient}>
                    <HeroUIProvider>
                        <ThemeProvider attribute="class" defaultTheme="dark">
                            <App />
                            <Toaster position="top-right" richColors closeButton />
                        </ThemeProvider>
                    </HeroUIProvider>
                </QueryClientProvider>
            </PersistGate>
        </Provider>
    </StrictMode>
);

if ("serviceWorker" in navigator) {
    const hadController = Boolean(navigator.serviceWorker.controller);
    let isReloading = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (hadController && !isReloading) {
            isReloading = true;
            window.location.reload();
        }
    });

    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/sw.js", { updateViaCache: "none" })
            .then((registration) => {
                registration.update();
                window.setInterval(() => registration.update(), 60_000);
                document.addEventListener("visibilitychange", () => {
                    if (document.visibilityState === "visible") registration.update();
                });
            })
            .catch((registrationError) => {
                console.error("Service worker registration failed:", registrationError);
            });
    });
}
