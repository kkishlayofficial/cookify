export const locales = ["en", "hi", "zh", "ru", "es", "fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  hi: "\u0939\u093f\u0928\u094d\u0926\u0940", // Hindi
  zh: "\u4e2d\u6587", // Mandarin
  ru: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", // Russian
  es: "Espa\u00f1ol",
  fr: "Fran\u00e7ais",
};
