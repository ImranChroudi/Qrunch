"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/data/admin";
import {
  passwordSchema,
  profileInputSchema,
  restaurantSettingsSchema,
} from "@/lib/validation/schemas";
import { fieldErrors } from "@/lib/validation/primitives";
import { failure, success, type ActionResult } from "@/lib/action-result";

export async function updateRestaurantSettings(
  formData: FormData,
): Promise<ActionResult<{ slug: string }>> {
  try {
    const { restaurant } = await getAdminContext();
    const raw = Object.fromEntries(formData.entries());

    const parsed = restaurantSettingsSchema.safeParse({
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      logoUrl: raw.logoUrl,
      coverUrl: raw.coverUrl,
      phone: raw.phone,
      whatsapp: raw.whatsapp,
      address: raw.address,
      openingHours: raw.openingHours,
      instagram: raw.instagram,
      facebook: raw.facebook,
      primaryColor: raw.primaryColor,
      secondaryColor: raw.secondaryColor,
      menuStyle: raw.menuStyle,
      currency: raw.currency,
      locale: raw.locale,
      isPublished: raw.isPublished,
      isIndexable: raw.isIndexable,
    });

    if (!parsed.success) {
      return failure("Please fix the form errors", fieldErrors(parsed.error));
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("restaurants")
      .update({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        logo_url: parsed.data.logoUrl,
        cover_url: parsed.data.coverUrl,
        phone: parsed.data.phone,
        whatsapp: parsed.data.whatsapp,
        address: parsed.data.address,
        opening_hours: parsed.data.openingHours,
        instagram: parsed.data.instagram,
        facebook: parsed.data.facebook,
        primary_color: parsed.data.primaryColor,
        secondary_color: parsed.data.secondaryColor,
        menu_style: parsed.data.menuStyle,
        currency: parsed.data.currency,
        locale: parsed.data.locale,
        is_published: parsed.data.isPublished,
        is_indexable: parsed.data.isIndexable,
      })
      .eq("id", restaurant.id);

    if (error) {
      return failure(error.message || "Could not update settings");
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    revalidatePath(`/menu/${parsed.data.slug}`);
    if (parsed.data.slug !== restaurant.slug) {
      revalidatePath(`/menu/${restaurant.slug}`);
    }

    return success({ slug: parsed.data.slug }, "Restaurant settings updated");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update settings";
    return failure(message);
  }
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  try {
    const { profile } = await getAdminContext();

    const parsed = profileInputSchema.safeParse({
      fullName: formData.get("fullName") ?? "",
      locale: formData.get("locale") ?? "en",
    });
    if (!parsed.success) {
      return failure("Please fix the form errors", fieldErrors(parsed.error));
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.fullName?.trim() || null,
        locale: parsed.data.locale,
      })
      .eq("id", profile.id);

    if (error) return failure(error.message || "Could not update profile");
    revalidatePath("/dashboard/account");
    return success(undefined, "Profile updated");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Could not update profile");
  }
}

export async function changePassword(formData: FormData): Promise<ActionResult> {
  try {
    const parsed = passwordSchema.safeParse({
      newPassword: formData.get("newPassword") ?? "",
      confirmPassword: formData.get("confirmPassword") ?? "",
    });
    if (!parsed.success) {
      return failure("Please fix the form errors", fieldErrors(parsed.error));
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });
    if (error) return failure(error.message || "Could not change password");

    return success(undefined, "Password updated");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Could not change password");
  }
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
