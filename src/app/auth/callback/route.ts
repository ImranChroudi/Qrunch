import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(`${siteUrl}/login?error=auth-callback-failed`);
    }
  }

  if (type === "recovery") {
    return NextResponse.redirect(`${siteUrl}/dashboard/account?recovery=true`);
  }

  return NextResponse.redirect(`${siteUrl}${next}`);
}
