"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/data/admin";
import { menuItemInputSchema, menuItemUpdateSchema, reorderSchema } from "@/lib/validation/schemas";
import { fieldErrors } from "@/lib/validation/primitives";
import { mergeTranslations } from "@/lib/i18n";
import { failure, success, type ActionResult } from "@/lib/action-result";

export async function createMenuItem(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const { restaurant } = await getAdminContext();
    const raw = Object.fromEntries(formData.entries());

    const parsed = menuItemInputSchema.safeParse({
      name: raw.name,
      nameAr: raw.nameAr,
      description: raw.description,
      descriptionAr: raw.descriptionAr,
      price: raw.price,
      categoryId: raw.categoryId,
      imageUrl: raw.imageUrl,
      isAvailable: raw.isAvailable,
      isFeatured: raw.isFeatured,
      isActive: raw.isActive,
      tags: raw.tags ? String(raw.tags).split(",") : [],
    });

    if (!parsed.success) {
      return failure("Please fix the form errors", fieldErrors(parsed.error));
    }

    const supabase = await createClient();

    const { data: maxOrder } = await supabase
      .from("menu_items")
      .select("display_order")
      .eq("restaurant_id", restaurant.id)
      .eq("category_id", parsed.data.categoryId)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const displayOrder = (maxOrder?.display_order ?? 0) + 1;

    const translations = mergeTranslations(null, {
      fr: { name: parsed.data.name, description: parsed.data.description },
      ar: { name: parsed.data.nameAr, description: parsed.data.descriptionAr },
    });

    const { data, error } = await supabase
      .from("menu_items")
      .insert({
        restaurant_id: restaurant.id,
        category_id: parsed.data.categoryId,
        name: parsed.data.name,
        description: parsed.data.description,
        price: parsed.data.price,
        image_url: parsed.data.imageUrl,
        is_available: parsed.data.isAvailable,
        is_featured: parsed.data.isFeatured,
        is_active: parsed.data.isActive,
        tags: parsed.data.tags,
        translations,
        display_order: displayOrder,
      })
      .select("id")
      .single();

    if (error) {
      return failure(error.message || "Could not create menu item");
    }

    revalidatePath("/dashboard/menu");
    revalidatePath(`/menu/${restaurant.slug}`);

    return success({ id: data.id }, "Menu item created");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Could not create menu item");
  }
}

export async function updateMenuItem(formData: FormData): Promise<ActionResult> {
  try {
    const { restaurant } = await getAdminContext();
    const raw = Object.fromEntries(formData.entries());

    const parsed = menuItemUpdateSchema.safeParse({
      id: raw.id,
      name: raw.name,
      nameAr: raw.nameAr,
      description: raw.description,
      descriptionAr: raw.descriptionAr,
      price: raw.price,
      categoryId: raw.categoryId,
      imageUrl: raw.imageUrl,
      isAvailable: raw.isAvailable,
      isFeatured: raw.isFeatured,
      isActive: raw.isActive,
      tags: raw.tags ? String(raw.tags).split(",") : undefined,
    });

    if (!parsed.success) {
      return failure("Please fix the form errors", fieldErrors(parsed.error));
    }

    const supabase = await createClient();

    const { data: current } = await supabase
      .from("menu_items")
      .select("translations")
      .eq("id", parsed.data.id)
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();

    const translations = mergeTranslations(current?.translations, {
      fr: { name: parsed.data.name, description: parsed.data.description },
      ar: { name: parsed.data.nameAr, description: parsed.data.descriptionAr },
    });

    const { error } = await supabase
      .from("menu_items")
      .update({
        name: parsed.data.name,
        description: parsed.data.description,
        price: parsed.data.price,
        category_id: parsed.data.categoryId,
        image_url: parsed.data.imageUrl,
        is_available: parsed.data.isAvailable,
        is_featured: parsed.data.isFeatured,
        is_active: parsed.data.isActive,
        tags: parsed.data.tags,
        translations,
      })
      .eq("id", parsed.data.id)
      .eq("restaurant_id", restaurant.id);

    if (error) return failure(error.message || "Could not update menu item");

    revalidatePath("/dashboard/menu");
    revalidatePath(`/menu/${restaurant.slug}`);

    return success(undefined, "Menu item updated");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Could not update menu item");
  }
}

export async function deleteMenuItem(id: string): Promise<ActionResult> {
  try {
    const { restaurant } = await getAdminContext();
    const supabase = await createClient();

    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", restaurant.id);

    if (error) return failure(error.message || "Could not delete menu item");

    revalidatePath("/dashboard/menu");
    revalidatePath(`/menu/${restaurant.slug}`);

    return success(undefined, "Menu item deleted");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Could not delete menu item");
  }
}

export async function reorderMenuItems(ids: string[]): Promise<ActionResult> {
  try {
    const parsed = reorderSchema.safeParse({ ids });
    if (!parsed.success) return failure("Invalid order");

    const supabase = await createClient();
    const { error } = await supabase.rpc("reorder_menu_items", { p_ids: parsed.data.ids });

    if (error) return failure(error.message || "Could not reorder menu items");

    revalidatePath("/dashboard/menu");
    revalidatePath("/menu");

    return success(undefined, "Order updated");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Could not reorder menu items");
  }
}
