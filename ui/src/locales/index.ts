import { useEffect } from "react";
import { store, useAppSelector } from "../store";
import { am } from "./am";
import { en } from "./en";

export type Language = "en" | "am";
export type LocaleKey = string;
export const locales = { en, am };
export function tr(key: LocaleKey) {
    const language = store.getState().settings.language as Language;
    return locales[language][key] ?? key;
}

export function useTranslation() {
    const language = useAppSelector((state) => state.settings.language) as Language;
    useEffect(() => {
        document.documentElement.lang = language === "am" ? "am" : "en";
        document.documentElement.dir = "ltr";
        document.title = tr("Siro Bakery Management");
        document
            .querySelector('meta[name="description"]')
            ?.setAttribute(
                "content",
                tr("Siro Bakery management for sales, production, inventory, staff, and treasury.")
            );
        document
            .querySelector('link[rel="manifest"]')
            ?.setAttribute(
                "href",
                language === "am" ? "/manifest.am.webmanifest" : "/manifest.webmanifest"
            );
        localStorage.setItem("bakery-language", language);
    }, [language]);
    return { language, t: (key: LocaleKey) => locales[language][key] ?? key };
}
