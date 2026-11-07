import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { restaurantOnboardingSchema } from "@/lib/validation/schemas";
import { siteUrl } from "@/lib/env";


export async function POST(request: Request) {
  const supabase = await createClient();
  const formData = await request.formData();
  const payload = {
    name: formData.get("name"),
    slug: formData.get("slug"),
  };
  const parsed = restaurantOnboardingSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.redirect(`${siteUrl}/dashboard?error=invalid-name`);
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  const { error } = await supabase.rpc("create_restaurant_for_self", {
    p_restaurant_name: parsed.data.name,
    p_slug: parsed.data.slug ?? null,
  });

  if (error) {
    return NextResponse.redirect(`${siteUrl}/dashboard?error=onboarding-failed`);
  }

  return NextResponse.redirect(`${siteUrl}/dashboard`);
}
