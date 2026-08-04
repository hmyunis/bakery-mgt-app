import { Button } from "@heroui/react";
import { useAppDispatch } from "../../store";
import { setLanguage } from "../../store/settingsSlice";
import { useTranslation } from "../../locales";

export function LanguageToggle() {
    const dispatch = useAppDispatch();
    const { language, t } = useTranslation();
    const next = language === "en" ? "am" : "en";
    const flagSource = language === "en" ? "/icons/flag-et.svg" : "/icons/flag-gb.svg";
    return (
        <Button
            size="sm"
            variant="light"
            aria-label={t("toggleLanguage")}
            title={t("toggleLanguage")}
            onPress={() => dispatch(setLanguage(next))}
            isIconOnly
            className="min-w-10 overflow-hidden rounded-full p-1"
        >
            <img
                src={flagSource}
                alt=""
                aria-hidden="true"
                className="h-5 w-8 rounded-sm object-cover shadow-sm"
            />
        </Button>
    );
}
