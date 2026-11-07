"use client";

import { cn } from "@/lib/utils";
import { CONTENT_LOCALES, menuStrings, type ContentLocale } from "@/lib/i18n";

const LOCALE_LABELS: Record<ContentLocale, string> = {
  fr: "Français",
  ar: "العربية",
};

/**
 * Segmented FR/AR control used on the public menu. Purely presentational: the
 * parent owns the selected value and its persistence.
 */
export function LanguageSwitcher({
  value,
  onChange,
  className,
}: {
  value: ContentLocale;
  onChange: (locale: ContentLocale) => void;
  className?: string;
}) {
  const strings = menuStrings(value);

  return (
    <div
      role="group"
      aria-label={strings.switchLabel}
      className={cn("flex shrink-0 items-center gap-0.5 rounded-md border bg-background p-0.5", className)}
    >
      {CONTENT_LOCALES.map((locale) => {
        const active = value === locale;
        return (
          <button
            key={locale}
            type="button"
            dir={locale === "ar" ? "rtl" : "ltr"}
            aria-pressed={active}
            onClick={() => onChange(locale)}
            className={cn(
              "rounded px-2.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {LOCALE_LABELS[locale]}
          </button>
        );
      })}
    </div>
  );
}