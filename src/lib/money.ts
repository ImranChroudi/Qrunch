/**
 * Price formatting shared by the public menu and the dashboard, so an amount can
 * never render differently in the two places.
 */

const CURRENCY_LABELS: Record<string, string> = {
  MAD: "DH",
  EUR: "€",
  USD: "$",
  GBP: "£",
  TND: "DT",
  DZD: "DA",
  EGP: "EGP",
  SAR: "SAR",
  AED: "AED",
};

const NUMBER_FORMATTERS = new Map<string, Intl.NumberFormat>();

function formatterFor(locale: string) {
  let formatter = NUMBER_FORMATTERS.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    NUMBER_FORMATTERS.set(locale, formatter);
  }
  return formatter;
}

/** `45` → `"45 DH"`, `45.5` → `"45.50 DH"`. */
export function formatPrice(amount: number, currency = "MAD", locale = "en") {
  const label = CURRENCY_LABELS[currency.toUpperCase()] ?? currency.toUpperCase();
  return `${formatterFor(locale).format(amount)} ${label}`;
}

/** Parse an amount typed by an admin, tolerating `45,50` and `45 DH`. */
export function parsePriceInput(value: string): number | null {
  const normalised = value.trim().replace(/[^\d.,-]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalised)) return null;
  const parsed = Number.parseFloat(normalised);
  return Number.isFinite(parsed) ? parsed : null;
}
