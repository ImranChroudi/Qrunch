"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getAdminContext, listItemIdsInCategory } from "@/lib/data/admin";
import { categoryInputSchema, categoryUpdateSchema, reorderSchema } from "@/lib/validation/schemas";
import { fieldErrors } from "@/lib/validation/primitives";
import { mergeTranslations } from "@/lib/i18n";
import { failure, success, type ActionResult } from "@/lib/action-result";

export async function createCategory(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const { restaurant } = await getAdminContext();
    const raw = Object.fromEntries(formData.entries());

    const parsed = categoryInputSchema.safeParse({
      name: raw.name,
      nameAr: raw.nameAr,
      description: raw.description,
      descriptionAr: raw.descriptionAr,
      imageUrl: raw.imageUrl,
      emoji: raw.emoji,
      isActive: raw.isActive,
    });

    if (!parsed.success) {
      return failure("Please fix the form errors", fieldErrors(parsed.error));
    }

    const supabase = await createClient();

    const { data: maxOrder } = await supabase
      .from("categories")
      .select("display_order")
      .eq("restaurant_id", restaurant.id)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const displayOrder = (maxOrder?.display_order ?? 0) + 1;

    const translations = mergeTranslations(null, {
      fr: { name: parsed.data.name, description: parsed.data.description },
      ar: { name: parsed.data.nameAr, description: parsed.data.descriptionAr },
    });

    const { data, error } = await supabase
      .from("categories")
      .insert({
        restaurant_id: restaurant.id,
        name: parsed.data.name,
        description: parsed.data.description,
        image_url: parsed.data.imageUrl,
        emoji: parsed.data.emoji,
        is_active: parsed.data.isActive,
        translations,
        display_order: displayOrder,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return failure("A category with this name already exists");
      }
      return failure(error.message || "Could not create category");
    }

    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/menu");
    revalidatePath(`/menu/${restaurant.slug}`);

    return success({ id: data.id }, "Category created");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Could not create category");
  }
}

export async function updateCategory(formData: FormData): Promise<ActionResult> {
  try {
    const { restaurant } = await getAdminContext();
    const raw = Object.fromEntries(formData.entries());

    const parsed = categoryUpdateSchema.safeParse({
      id: raw.id,
      name: raw.name,
      nameAr: raw.nameAr,
      description: raw.description,
      descriptionAr: raw.descriptionAr,
      imageUrl: raw.imageUrl,
      emoji: raw.emoji,
      isActive: raw.isActive,
    });

    if (!parsed.success) {
      return failure("Please fix the form errors", fieldErrors(parsed.error));
    }

    const supabase = await createClient();

    const { data: current } = await supabase
      .from("categories")
      .select("translations")
      .eq("id", parsed.data.id)
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();

    const translations = mergeTranslations(current?.translations, {
      fr: { name: parsed.data.name, description: parsed.data.description },
      ar: { name: parsed.data.nameAr, description: parsed.data.descriptionAr },
    });

    const { error } = await supabase
      .from("categories")
      .update({
        name: parsed.data.name,
        description: parsed.data.description,
        image_url: parsed.data.imageUrl,
        emoji: parsed.data.emoji,
        is_active: parsed.data.isActive,
        translations,
      })
      .eq("id", parsed.data.id)
      .eq("restaurant_id", restaurant.id);

    if (error) {
      if (error.code === "23505") {
        return failure("A category with this name already exists");
      }
      return failure(error.message || "Could not update category");
    }

    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/menu");
    revalidatePath(`/menu/${restaurant.slug}`);

    return success(undefined, "Category updated");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Could not update category");
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    const { restaurant } = await getAdminContext();
    const supabase = await createClient();

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", restaurant.id);

    if (error) return failure(error.message || "Could not delete category");

    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/menu");
    revalidatePath(`/menu/${restaurant.slug}`);

    return success(undefined, "Category deleted");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Could not delete category");
  }
}

export async function reorderCategories(ids: string[]): Promise<ActionResult> {
  try {
    const parsed = reorderSchema.safeParse({ ids });
    if (!parsed.success) return failure("Invalid order");

    const supabase = await createClient();
    const { error } = await supabase.rpc("reorder_categories", { p_ids: parsed.data.ids });

    if (error) return failure(error.message || "Could not reorder categories");

    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/menu");
    revalidatePath("/menu");

    return success(undefined, "Order updated");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Could not reorder categories");
  }
}

export async function reorderItemsInCategory(categoryId: string, ids: string[]): Promise<ActionResult> {
  try {
    const { restaurant } = await getAdminContext();
    const parsed = reorderSchema.safeParse({ ids });
    if (!parsed.success) return failure("Invalid order");

    const current = await listItemIdsInCategory(categoryId);
    const sameSet = parsed.data.ids.length === current.length && parsed.data.ids.every((id) => current.includes(id));
    if (!sameSet) {
      return failure("Order contains items from another category");
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("reorder_menu_items", { p_ids: parsed.data.ids });

    if (error) return failure(error.message || "Could not reorder items");

    revalidatePath("/dashboard/menu");
    revalidatePath(`/menu/${restaurant.slug}`);

    return success(undefined, "Order updated");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Could not reorder items");
  }
}
