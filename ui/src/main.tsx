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
import "./i18n";
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
                            <Toaster position="top-right" richColors />
                        </ThemeProvider>
                    </HeroUIProvider>
                </QueryClientProvider>
            </PersistGate>
        </Provider>
    </StrictMode>
);
