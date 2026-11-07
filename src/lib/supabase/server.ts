import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Request-scoped Supabase client for Server Components, Route Handlers and
 * Server Actions. Reads and writes cookies, so it may only be called from a
 * request context.
 *
 * Important: this client carries the *user's* JWT, so every query it runs is
 * subject to Row Level Security. Authorisation is therefore enforced by the
 * database, not by anything in this file.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = publicSupabaseEnv();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Session refresh is handled by middleware, so this is safe to ignore.
        }
      },
    },
  });
}

/** Service-role client. Bypasses RLS — scripts and provisioning only. */
export async function createAdminClient() {
  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
  const { url } = publicSupabaseEnv();
  const { serviceRoleKey } = await import("@/lib/env");

  return createSupabaseClient<Database>(url, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
