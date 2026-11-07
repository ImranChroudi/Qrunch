import { type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Before the project is configured there is no session to refresh and no
  // request to authorise. Pages render a setup notice instead of crashing.
  if (!isSupabaseConfigured) {
    return undefined;
  }

  const { pathname } = request.nextUrl;

  // Never run the Supabase client for assets or the print view.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") ||
    pathname.startsWith("/api/health")
  ) {
    return undefined;
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|webmanifest)$).*)"],
};
