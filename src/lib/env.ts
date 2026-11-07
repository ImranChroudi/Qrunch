/**
 * Central, validated access to environment variables.
 *
 * Every value is read through this module so that a missing variable produces a
 * single understandable message on screen instead of a `undefined is not an
 * object` crash inside the Supabase SDK.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

/**
 * Absolute origin of this deployment, no trailing slash. Used to build the
 * public menu URL that gets encoded into the QR code, so it must be the real
 * deployed origin — not a relative path.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000"
).replace(/\/+$/, "");

export function publicSupabaseEnv() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and set " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return {
    url: supabaseUrl as string,
    key: supabasePublishableKey as string,
  };
}

/** Throws unless the service-role key is present. Server-side only. */
export function serviceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. It is required by scripts/ " +
        "(db:seed, verify) and must never be exposed to the browser.",
    );
  }
  return key;
}
