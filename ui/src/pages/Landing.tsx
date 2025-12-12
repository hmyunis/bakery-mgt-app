import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Switch,
  Tooltip,
} from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { Globe2, Loader2, Moon, Palette, Sparkles, Sun } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../lib/apiClient";
import { useAppDispatch, useAppSelector } from "../store";
import { setAccent, setLanguage, toggleMode } from "../store/settingsSlice";

const accents = {
  cyan: "#06b6d4",
  emerald: "#10b981",
  violet: "#8b5cf6",
  amber: "#f59e0b",
  rose: "#f43f5e",
  blue: "#3b82f6",
};

export function LandingPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { mode, accent, language } = useAppSelector((s) => s.settings);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.style.setProperty("--accent", accents[accent]);
  }, [mode, accent]);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [i18n, language]);

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await apiClient.get("/health");
      return response.data;
    },
  });

  const healthStatus = (() => {
    if (healthQuery.isLoading) return t("checking");
    if (healthQuery.isError) return t("failed");
    return t("healthy");
  })();

  return (
    <div className="min-h-screen flex flex-col text-[var(--fg)]">
      <header className="mx-auto w-full max-w-6xl px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-gradient-to-br from-[var(--accent)] via-[var(--accent)]/70 to-purple-600/80 flex items-center justify-center shadow-lg shadow-[var(--accent)]/40">
            <span className="text-lg font-semibold">🍞</span>
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[var(--muted)]/90">
              {t("brandTag")}
            </p>
            <p className="text-lg font-semibold">{t("brandTitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Tooltip content={mode === "dark" ? "Light mode" : "Dark mode"}>
            <Switch
              aria-label="toggle theme"
              isSelected={mode === "dark"}
              onValueChange={() => dispatch(toggleMode())}
              thumbIcon={
                mode === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />
              }
            />
          </Tooltip>
          <Tooltip content="Language">
            <Button
              isIconOnly
              variant="light"
              onPress={() => dispatch(setLanguage(language === "en" ? "am" : "en"))}
            >
              <Globe2 className="size-5" />
            </Button>
          </Tooltip>
          <Button color="secondary" variant="flat" className="border border-[var(--accent)]/30">
            Dashboard
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="w-full max-w-5xl text-center space-y-10">
          <div className="space-y-4">
            <Chip
              variant="flat"
              color="primary"
              className="bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30"
            >
              {t("heroPill")}
            </Chip>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
              {t("heroTitle")}
            </h1>
            <p className="text-lg sm:text-xl text-[var(--muted)] max-w-3xl mx-auto">
              {t("heroSubtitle")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Button
                color="primary"
                className="px-6 bg-[var(--accent)] text-white border border-[var(--accent)]/50"
              >
                {t("ctaPrimary")}
              </Button>
              <Button variant="bordered" className="border-[var(--fg)]/20 text-[var(--fg)]">
                {t("ctaSecondary")}
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-[var(--panel)] backdrop-blur-xl border border-[var(--border)] shadow-2xl">
              <CardHeader className="flex items-center gap-3">
                <Sparkles className="size-5 text-[var(--accent)]" />
                <div className="text-left">
                  <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]/80">
                    Snapshot
                  </p>
                  <p className="text-xl font-semibold">{t("stackTitle")}</p>
                </div>
              </CardHeader>
              <Divider />
              <CardBody className="space-y-3 text-left">
                <Chip variant="flat" color="primary">
                  React 19 + TS
                </Chip>
                <Chip variant="flat" color="secondary">
                  Vite 7
                </Chip>
                <Chip variant="flat" color="success">
                  Tailwind v4
                </Chip>
                <Chip variant="flat" color="warning">
                  HeroUI
                </Chip>
              </CardBody>
            </Card>

            <Card className="bg-[var(--panel)] backdrop-blur-xl border border-[var(--border)] shadow-2xl md:col-span-2">
              <CardHeader className="flex items-start justify-between gap-3">
                <div className="text-left space-y-1">
                  <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]/80">
                    {t("settingsTitle")}
                  </p>
                  <p className="text-xl font-semibold">{t("themeLabel")}</p>
                </div>
                <Palette className="size-5 text-[var(--accent)]" />
              </CardHeader>
              <Divider />
              <CardBody className="grid gap-6 md:grid-cols-2">
                <div className="text-left space-y-3">
                  <p className="text-sm text-[var(--muted)]">{t("languageLabel")}</p>
                  <div className="flex gap-2">
                    {(["en", "am"] as const).map((lang) => (
                      <Button
                        key={lang}
                        variant={language === lang ? "solid" : "bordered"}
                        className={
                          language === lang
                            ? "bg-[var(--accent)] text-white border-[var(--accent)]/60"
                            : "border-[var(--fg)]/20 text-[var(--fg)]"
                        }
                        onPress={() => dispatch(setLanguage(lang))}
                      >
                        {lang === "en" ? "English" : "አማርኛ"}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Switch
                      aria-label="toggle theme"
                      isSelected={mode === "dark"}
                      onValueChange={() => dispatch(toggleMode())}
                      thumbIcon={
                        mode === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />
                      }
                    />
                    <span className="text-sm text-[var(--muted)]">
                      {mode === "dark" ? "Dark" : "Light"}
                    </span>
                  </div>
                </div>
                <div className="text-left space-y-3">
                  <p className="text-sm text-[var(--muted)]">{t("accentLabel")}</p>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(accents).map(([key, value]) => (
                      <button
                        key={key}
                        aria-label={key}
                        onClick={() => dispatch(setAccent(key as keyof typeof accents))}
                        className={`size-10 rounded-full border-2 transition hover:scale-105 ${
                          accent === key
                            ? "border-[var(--fg)] ring-2 ring-[var(--accent)]/60"
                            : "border-[var(--border)]"
                        }`}
                        style={{ backgroundColor: value }}
                      />
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          <Card className="bg-[var(--panel)] backdrop-blur-xl border border-[var(--border)] shadow-2xl">
            <CardHeader className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]/80">
                  {t("systemStatus")}
                </p>
                <p className="text-xl font-semibold">API / Query</p>
              </div>
              <Chip
                variant="flat"
                color={
                  healthQuery.isLoading
                    ? "warning"
                    : healthQuery.isError
                      ? "danger"
                      : "success"
                }
              >
                {healthStatus}
              </Chip>
            </CardHeader>
            <Divider />
            <CardBody className="flex items-center gap-3">
              {healthQuery.isLoading ? (
                <Loader2 className="size-5 animate-spin text-[var(--accent)]" />
              ) : (
                <Sparkles className="size-5 text-[var(--accent)]" />
              )}
              <p className="text-sm text-left text-[var(--muted)]">
                {healthQuery.isLoading
                  ? "Pinging /health via TanStack Query + axios..."
                  : healthQuery.isError
                    ? "Failed to reach /health. Check API base URL or auth."
                    : "Backend reachable. Queries are cached and typed via TanStack Query."}
              </p>
            </CardBody>
          </Card>
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-[var(--muted)]">
        Made with ❤️ using HeroUI, Tailwind, Vite, TanStack Query, and Bun.
      </footer>
    </div>
  );
}

