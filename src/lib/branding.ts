/**
 * Restaurant branding helpers.
 *
 * A restaurant picks two hex colours; the public menu derives everything else
 * (on-colour text, tinted surfaces, focus rings) from them at render time via
 * CSS custom properties. No colour is hard-coded in the menu components.
 */

function clamp(value: number, min = 0, max = 255) {
  return Math.min(max, Math.max(min, value));
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;

  const int = Number.parseInt(match[1] as string, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number) {
  const toHex = (value: number) => clamp(Math.round(value)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** WCAG relative luminance. */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const channel = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Pick the text colour that stays legible on `background`. Restaurant owners can
 * enter any hex they like, so the menu must not assume white text works.
 */
export function readableOn(background: string): string {
  const dark = "#1c1917";
  const light = "#ffffff";
  return contrastRatio(background, dark) >= contrastRatio(background, light) ? dark : light;
}

/** Lighten (`amount > 0`) or darken (`amount < 0`) a hex colour. */
export function shade(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const mix = amount >= 0 ? 255 : 0;
  const ratio = Math.abs(amount);

  return rgbToHex(
    rgb.r + (mix - rgb.r) * ratio,
    rgb.g + (mix - rgb.g) * ratio,
    rgb.b + (mix - rgb.b) * ratio,
  );
}

export type BrandTheme = {
  primary: string;
  secondary: string;
  onPrimary: string;
  onSecondary: string;
};

export function brandTheme(primary: string, secondary: string): BrandTheme {
  return {
    primary,
    secondary,
    onPrimary: readableOn(primary),
    onSecondary: readableOn(secondary),
  };
}

const FALLBACK_PRIMARY = "#b45309";
const FALLBACK_SECONDARY = "#1c1917";

/** CSS custom properties consumed by the public menu's Tailwind classes. */
export function brandCssVars(
  primary: string | null,
  secondary: string | null,
): Record<string, string> {
  const safePrimary = hexToRgb(primary ?? "") ? (primary as string) : FALLBACK_PRIMARY;
  const safeSecondary = hexToRgb(secondary ?? "") ? (secondary as string) : FALLBACK_SECONDARY;

  return {
    "--brand-primary": safePrimary,
    "--brand-secondary": safeSecondary,
    "--brand-on-primary": readableOn(safePrimary),
    "--brand-on-secondary": readableOn(safeSecondary),
    "--brand-surface": shade(safePrimary, 0.92),
    "--brand-surface-strong": shade(safePrimary, 0.84),
  };
}
