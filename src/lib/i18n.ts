import type { Json } from "@/types/database";

/**
 * Internationalisation readiness.
 *
 * The MVP renders a single language, but every text-bearing table already has a
 * `translations jsonb` column shaped like:
 *
 *   { "fr": { "name": "Pizzas", "description": "..." }, "ar": { "name": "بيتزا" } }
 *
 * `localized()` reads from it and falls back to the scalar column, so switching
 * the admin UI to a translation editor later requires no data migration. RTL is
 * handled by `dir()` on the document element, not by per-component logic.
 */

export const SUPPORTED_LOCALES = [
  { code: "en", label: "English", dir: "ltr" as const },
  { code: "fr", label: "Français", dir: "ltr" as const },
  { code: "ar", label: "العربية", dir: "rtl" as const },
];

export const DEFAULT_LOCALE = "en";

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]["code"];
export type TextDirection = "ltr" | "rtl";

/**
 * Languages a customer can switch between on the public menu. They are also the
 * keys used inside the `translations jsonb` column on restaurants, categories and
 * menu items:
 *
 *   { "fr": { "name": "Pizzas" }, "ar": { "name": "بيتزا" } }
 */
export const CONTENT_LOCALES = ["fr", "ar"] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];

export const LANGUAGE_STORAGE_KEY = "menuqr:language";
export const LANGUAGE_COOKIE_KEY = "menuqr_lang";

export function isContentLocale(value: string | null | undefined): value is ContentLocale {
  return value === "fr" || value === "ar";
}

/**
 * Pick the language to render: an explicit saved choice wins, then the
 * restaurant's configured locale, then French as the primary language.
 */
export function resolveMenuLocale(
  saved?: string | null,
  restaurantLocale?: string | null,
): ContentLocale {
  if (isContentLocale(saved)) return saved;
  const base = baseLanguage(restaurantLocale ?? "");
  return isContentLocale(base) ? base : "fr";
}

export function isSupportedLocale(value: string | null | undefined): value is LocaleCode {
  return SUPPORTED_LOCALES.some((locale) => locale.code === value);
}

export function normaliseLocale(value: string | null | undefined): LocaleCode {
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

/** Base language of a tag such as `fr-FR` → `fr`. */
export function baseLanguage(value: string) {
  return value.split(/[-_]/)[0]?.toLowerCase() ?? DEFAULT_LOCALE;
}

export function dirFor(locale: string | null | undefined): TextDirection {
  const base = baseLanguage(normalizeLocaleSafe(locale));
  return SUPPORTED_LOCALES.find((entry) => entry.code === base)?.dir ?? "ltr";
}

function normalizeLocaleSafe(value: string | null | undefined) {
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Resolve a field for `locale`, walking `fr-CA` → `fr` → the scalar fallback.
 * Returns `null` when there is genuinely nothing to show.
 */
export function localized(
  translations: Json | null | undefined,
  locale: string | null | undefined,
  field: "name" | "description",
  fallback: string | null | undefined,
): string | null {
  if (translations && typeof translations === "object" && !Array.isArray(translations)) {
    const bag = translations as Record<string, unknown>;
    const candidates = [locale, baseLanguage(locale ?? DEFAULT_LOCALE), DEFAULT_LOCALE];

    for (const candidate of candidates) {
      if (!candidate) continue;
      const entry = bag[candidate];
      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        const value = (entry as Record<string, unknown>)[field];
        if (typeof value === "string" && value.trim()) return value;
      }
    }
  }

  return fallback && fallback.trim() ? fallback : null;
}

/** Locale-aware BCP-47 tag for `lang` / `dir` attributes. */
export function localeTag(locale: string | null | undefined) {
  const base = baseLanguage(normalizeLocaleSafe(locale));
  return SUPPORTED_LOCALES.find((entry) => entry.code === base)?.code ?? DEFAULT_LOCALE;
}

/** The fields a locale can override on any text-bearing row. */
export type TranslationFields = { name?: string | null; description?: string | null };

/** Read a single translated field. Returns `""` when it is not set. */
export function translationValue(
  translations: Json | null | undefined,
  locale: string,
  field: "name" | "description",
): string {
  if (!translations || typeof translations !== "object" || Array.isArray(translations)) return "";
  const entry = (translations as Record<string, unknown>)[locale];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return "";
  const value = (entry as Record<string, unknown>)[field];
  return typeof value === "string" ? value : "";
}

/**
 * Merge per-locale overrides into an existing `translations` value without
 * dropping locales or fields that are not part of this update. Empty strings
 * remove the key so `localized()` can fall back cleanly.
 */
export function mergeTranslations(
  existing: Json | null | undefined,
  updates: Partial<Record<string, TranslationFields>>,
): Json {
  const base: Record<string, unknown> =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  for (const [locale, fields] of Object.entries(updates)) {
    if (!fields) continue;

    const current: Record<string, unknown> =
      base[locale] && typeof base[locale] === "object" && !Array.isArray(base[locale])
        ? { ...(base[locale] as Record<string, unknown>) }
        : {};

    for (const [field, value] of Object.entries(fields)) {
      const text = typeof value === "string" ? value.trim() : "";
      if (text) current[field] = text;
      else delete current[field];
    }

    if (Object.keys(current).length > 0) base[locale] = current;
    else delete base[locale];
  }

  return base as Json;
}

/** Customer-facing chrome strings for the public menu, per content locale. */
const MENU_STRINGS = {
  fr: {
    searchPlaceholder: "Rechercher dans le menu…",
    featured: "En vedette",
    unavailable: "Indisponible",
    available: "Disponible",
    emptyCategory: "Aucun plat dans cette catégorie.",
    emptyResults: "Aucun résultat",
    emptyResultsHint: "Essayez un autre terme de recherche.",
    whatsapp: "WhatsApp",
    footer: "Menu digital propulsé par MenuQr",
    switchLabel: "Langue",
  },
  ar: {
    searchPlaceholder: "ابحث في القائمة…",
    featured: "مميّز",
    unavailable: "غير متوفّر",
    available: "متوفّر",
    emptyCategory: "لا توجد أطباق في هذه الفئة.",
    emptyResults: "لا توجد نتائج",
    emptyResultsHint: "جرّب كلمة بحث أخرى.",
    whatsapp: "واتساب",
    footer: "قائمة رقمية من إنتاج MenuQr",
    switchLabel: "اللغة",
  },
} as const;

export type MenuStrings = (typeof MENU_STRINGS)[ContentLocale];

export function menuStrings(locale: string | null | undefined): MenuStrings {
  return MENU_STRINGS[resolveMenuLocale(locale, null)];
}
