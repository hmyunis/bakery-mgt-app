import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      brandTag: "Bakery",
      brandTitle: "Baker Manager",
      heroPill: "HeroUI + Tailwind v4",
      heroTitle:
        "Delightful bakery management, crafted with React & HeroUI",
      heroSubtitle:
        "Modern frontend starter with Vite, Bun, Tailwind v4, and HeroUI components. This hero section is a quick sanity check that everything is wired up.",
      ctaPrimary: "Start exploring",
      ctaSecondary: "View docs",
      stackTitle: "Frontend stack",
      stackSetupTitle: "Setup",
      stackSetupDesc: "Blazing fast dev server, zero-config TS, and hot reloads.",
      stackStylingTitle: "Styling",
      stackStylingDesc: "Modern Tailwind pipeline via the official Vite plugin.",
      stackUiTitle: "UI Kit",
      stackUiDesc: "Accessible, themeable components ready for dashboards and portals.",
      settingsTitle: "Settings",
      themeLabel: "Appearance",
      languageLabel: "Language",
      accentLabel: "Theme color",
      systemStatus: "System status",
      healthy: "Healthy",
      checking: "Checking…",
      failed: "Unavailable",
    },
  },
  am: {
    translation: {
      brandTag: "ቤዝ",
      brandTitle: "የእንጀራ አስተዳዳሪ",
      heroPill: "HeroUI + Tailwind v4",
      heroTitle: "ማራኪ የእንጀራ አስተዳደር በ React እና HeroUI",
      heroSubtitle:
        "ዘመናዊ ፊት-ለፊት ማስጀመሪያ በ Vite፣ Bun፣ Tailwind v4 እና HeroUI ክፍሎች። ይህ ሄሮ ክፍል ነገር ሁሉ በትክክል እንደሚሰራ ፈጣን ምርመራ ነው።",
      ctaPrimary: "ጀምር",
      ctaSecondary: "ሰነዶችን ይመልከቱ",
      stackTitle: "የፊት-ለፊት መሠረት",
      stackSetupTitle: "ስታፕ",
      stackSetupDesc: "ፈጣን dev server፣ ዜሮ-config TS እና hot reloads።",
      stackStylingTitle: "አቀራረብ",
      stackStylingDesc: "ዘመናዊ Tailwind በኦፊሻል Vite ፕለጊን።",
      stackUiTitle: "የUI ኪት",
      stackUiDesc: "ተደራጀ እና ተስተካክሎ የሚያስተካክል ክፍሎች።",
      settingsTitle: "ማዋቀር",
      themeLabel: "አፔራንስ",
      languageLabel: "ቋንቋ",
      accentLabel: "የገጽታ ቀለም",
      systemStatus: "የስርዓት ሁኔታ",
      healthy: "ጤናማ",
      checking: "በመመርመር ላይ…",
      failed: "አይገኝም",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

