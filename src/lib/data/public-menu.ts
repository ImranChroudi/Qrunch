import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Category, MenuItem, Restaurant } from "@/types/database";

/**
 * Reads for the public, unauthenticated menu.
 *
 * Everything here is a plain `select` issued with the *anonymous* client: the
 * database decides what is visible. There is no filter in application code that
 * a client could omit, because the RLS policies in migration 003 already encode
 * exactly the same predicate. If a filter below were deleted the menu would
 * still not leak unpublished rows.
 */

export type PublicCategory = Pick<
  Category,
  "id" | "name" | "description" | "image_url" | "emoji" | "display_order" | "translations"
> & { menu_items: PublicMenuItem[] };

export type PublicMenuItem = Pick<
  MenuItem,
  "id" | "category_id" | "name" | "description" | "price" | "image_url" | "is_available" | "is_featured" | "display_order" | "tags" | "translations"
>;

export type PublicMenu = {
  restaurant: Restaurant;
  categories: PublicCategory[];
};

/**
 * `cache()` deduplicates the lookup when several components on the same page
 * need the menu (hero, nav, list, footer all call it).
 */
export const getPublicMenu = cache(
  async (slug: string): Promise<PublicMenu | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("restaurants")
      .select(
        `id,name,slug,description,logo_url,cover_url,phone,whatsapp,address,opening_hours,instagram,facebook,primary_color,secondary_color,menu_style,currency,locale,translations,is_published,is_indexable,created_at,updated_at`,
      )
      .eq("slug", slug.toLowerCase())
      .maybeSingle();

    if (error || !data) return null;

    // Cheap guard so an unpublished restaurant renders its 404 instead of a
    // menu shell. It is not the security boundary — RLS already returned
    // nothing — it just avoids a confusing empty page.
    if (!data.is_published) return null;

    const [{ data: categoryRows, error: categoryError }, { data: itemRows, error: itemError }] =
      await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("restaurant_id", data.id)
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("menu_items")
          .select("*")
          .eq("restaurant_id", data.id)
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
      ]);

    if (categoryError || itemError || !categoryRows || !itemRows) return null;

    const itemsByCategory = new Map<string, PublicMenuItem[]>();
    for (const item of itemRows as PublicMenuItem[]) {
      const bucket = itemsByCategory.get(item.category_id as string);
      if (bucket) bucket.push(item as PublicMenuItem);
      else itemsByCategory.set(item.category_id as string, [item as PublicMenuItem]);
    }

    const categories: PublicCategory[] = (categoryRows as Category[])
      .map((category) => ({
        ...(category as unknown as PublicCategory),
        menu_items: itemsByCategory.get(category.id as string) ?? [],
      }))
      // A category with no visible dishes would render as an empty heading.
      .filter((category) => category.menu_items.length > 0);

    return { restaurant: data as Restaurant, categories };
  },
);
