import { createBrowserClient } from "@supabase/ssr";

import { publicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Browser-side Supabase client. Auth is persisted in cookies so that the
 * server can read the session during SSR; the client library writes to them
 * through its cookie adapter.
 */
export function createClient() {
  const { url, key } = publicSupabaseEnv();

  return createBrowserClient<Database>(url, key);
}
