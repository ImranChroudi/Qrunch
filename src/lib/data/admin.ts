import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Category, Profile, Restaurant } from "@/types/database";
import type { User } from "@supabase/supabase-js";
import {
  MENU_PAGE_SIZE,
  type MenuFilters,
  type MenuItemWithCategory,
  type MenuSort,
} from "@/lib/data/menu-filters";

/**
 * Reads for the authenticated dashboard.
 *
 * Every query is issued with the signed-in user's client, so Row Level Security
 * restricts results to their restaurant. The explicit `.eq("restaurant_id", …)`
 * filters are defence in depth: if RLS were ever accidentally relaxed, the app
 * would still only ask for its own tenant's rows.
 */

export type AdminContext = {
  user: User;
  profile: Profile;
  restaurant: Restaurant;
};

export class NotLinkedError extends Error {
  constructor() {
    super("This account is not linked to a restaurant yet.");
    this.name = "NotLinkedError";
  }
}

/**
 * Resolves the signed-in admin, their profile and their restaurant.
 * Throws `NotLinkedError` when the account exists but owns nothing yet.
 */
export const getAdminContext = cache(async (): Promise<AdminContext> => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.restaurant_id) {
    throw new NotLinkedError();
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", profile.restaurant_id)
    .single();

  if (!restaurant) {
    throw new NotLinkedError();
  }

  return { user, profile, restaurant };
});

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                   */
/* -------------------------------------------------------------------------- */

export type DashboardStats = {
  totalItems: number;
  availableItems: number;
  unavailableItems: number;
  hiddenItems: number;
  featuredItems: number;
  activeCategories: number;
  totalCategories: number;
  viewsLast7Days: number;
  viewsLast30Days: number;
  viewsPrevious30Days: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const { restaurant } = await getAdminContext();
  const supabase = await createClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [items, categories, views] = await Promise.all([
    supabase
      .from("menu_items")
      .select("id,is_available,is_active,is_featured", { count: "exact" })
      .eq("restaurant_id", restaurant.id),
    supabase
      .from("categories")
      .select("id,is_active", { count: "exact" })
      .eq("restaurant_id", restaurant.id),
    supabase
      .from("menu_views")
      .select("id,event,created_at", { count: "exact" })
      .eq("restaurant_id", restaurant.id)
      .gte("created_at", sixtyDaysAgo),
  ]);

  const itemRows = items.data ?? [];
  const categoryRows = categories.data ?? [];
  const viewRows = views.data ?? [];

  return {
    totalItems: items.count ?? itemRows.length,
    availableItems: itemRows.filter((row) => row.is_active && row.is_available).length,
    unavailableItems: itemRows.filter((row) => row.is_active && !row.is_available).length,
    hiddenItems: itemRows.filter((row) => !row.is_active).length,
    featuredItems: itemRows.filter((row) => row.is_active && row.is_featured).length,
    activeCategories: categoryRows.filter((row) => row.is_active).length,
    totalCategories: categories.count ?? categoryRows.length,
    viewsLast7Days: viewRows.filter((row) => row.created_at >= sevenDaysAgo).length,
    viewsLast30Days: viewRows.filter((row) => row.created_at >= thirtyDaysAgo).length,
    viewsPrevious30Days:
      viewRows.length - viewRows.filter((row) => row.created_at >= thirtyDaysAgo).length,
  };
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

export async function listCategories(): Promise<Category[]> {
  const { restaurant } = await getAdminContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Item counts per category id, for the management table. */
export async function countItemsPerCategory(): Promise<Record<string, number>> {
  const { restaurant } = await getAdminContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("menu_items")
    .select("category_id")
    .eq("restaurant_id", restaurant.id);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
  }
  return counts;
}

/* -------------------------------------------------------------------------- */
/* Menu items                                                                  */
/* -------------------------------------------------------------------------- */

export { MENU_SORTS, MENU_PAGE_SIZE } from "./menu-filters";
export type { MenuItemWithCategory, MenuFilters, MenuSort } from "./menu-filters";

type Orderable = {
  order: (
    column: string,
    options: { ascending: boolean; nullsFirst?: boolean },
  ) => Orderable;
};

function applySort(query: Orderable, sort: MenuSort): Orderable {
  switch (sort) {
    case "name":
      return query.order("name", { ascending: true });
    case "price_asc":
      return query.order("price", { ascending: true });
    case "price_desc":
      return query.order("price", { ascending: false });
    case "newest":
      return query.order("created_at", { ascending: false });
    default:
      return query.order("display_order", { ascending: true });
  }
}

/** Escapes the characters PostgREST's `or=` filter treats as syntax. */
function escapeLike(value: string) {
  return value.replace(/[%,()\\]/g, (match) => `\\${match}`);
}

export async function listMenuItems(
  filters: MenuFilters = {},
): Promise<{
  items: MenuItemWithCategory[];
  total: number;
  page: number;
  perPage: number;
}> {
  const { restaurant } = await getAdminContext();
  const supabase = await createClient();

  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(50, Math.max(5, filters.perPage ?? MENU_PAGE_SIZE));
  const from = (page - 1) * perPage;

  let query = supabase
    .from("menu_items")
    .select("*, categories ( id, name, emoji )", { count: "exact" })
    .eq("restaurant_id", restaurant.id);

  if (filters.search?.trim()) {
    const term = escapeLike(filters.search.trim());
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  switch (filters.availability) {
    case "available":
      query = query.eq("is_available", true).eq("is_active", true);
      break;
    case "unavailable":
      query = query.eq("is_available", false).eq("is_active", true);
      break;
    case "hidden":
      query = query.eq("is_active", false);
      break;
    default:
      break;
  }

  if (filters.featured) {
    query = query.eq("is_featured", true);
  }

  query = applySort(query as unknown as Orderable, filters.sort ?? "display_order") as typeof query;
  query = query.order("name", { ascending: true }).range(from, from + perPage - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    items: (data ?? []) as MenuItemWithCategory[],
    total: count ?? data?.length ?? 0,
    page,
    perPage,
  };
}

/** Items currently assigned to a category — needed for reorder payloads. */
export async function listItemIdsInCategory(categoryId: string): Promise<string[]> {
  const { restaurant } = await getAdminContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("menu_items")
    .select("id")
    .eq("restaurant_id", restaurant.id)
    .eq("category_id", categoryId)
    .order("display_order", { ascending: true });

  return (data ?? []).map((row) => row.id);
}

/** Full ordered list of one category — powers the drag-and-drop reorder view. */
export async function listItemsForReorder(
  categoryId: string,
): Promise<MenuItemWithCategory[]> {
  const { restaurant } = await getAdminContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("menu_items")
    .select("*, categories ( id, name, emoji )")
    .eq("restaurant_id", restaurant.id)
    .eq("category_id", categoryId)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MenuItemWithCategory[];
}

/* -------------------------------------------------------------------------- */
/* Analytics                                                                   */
/* -------------------------------------------------------------------------- */

export type AnalyticsBundle = {
  daily: { day: string; menuViews: number; itemViews: number; qrScans: number }[];
  totals: {
    menuViews: number;
    itemViews: number;
    categoryViews: number;
    qrScans: number;
    menuViewsPrevious: number;
  };
  topItems: {
    item_id: string;
    item_name: string;
    image_url: string | null;
    is_available: boolean;
    views: number;
  }[];
};

const EMPTY_DAYS = 30;

export async function getAnalytics(days = 30): Promise<AnalyticsBundle> {
  // getAdminContext doubles as the authorisation check; it throws when the
  // caller has no restaurant, so the RPCs below can never return someone
  // else's rows.
  await getAdminContext();
  const supabase = await createClient();

  const [{ data: daily }, { data: summary }, { data: topItems }] = await Promise.all([
    supabase.rpc("get_menu_analytics", { p_days: days }),
    supabase.rpc("get_analytics_summary", { p_days: days }),
    supabase.rpc("get_top_viewed_items", { p_days: days, p_limit: 8 }),
  ]);

  const byDay = new Map<string, { menuViews: number; itemViews: number; qrScans: number }>();

  // Pre-fill so the chart renders a continuous axis instead of collapsing gaps.
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(Date.now() - offset * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    byDay.set(day, { menuViews: 0, itemViews: 0, qrScans: 0 });
  }

  for (const row of daily ?? []) {
    const bucket = byDay.get(row.day) ?? { menuViews: 0, itemViews: 0, qrScans: 0 };
    if (row.event === "menu_view") {
      bucket.menuViews += Number(row.views);
      if (row.source === "qr") bucket.qrScans += Number(row.views);
    }
    if (row.event === "item_view") bucket.itemViews += Number(row.views);
    byDay.set(row.day, bucket);
  }

  const readSummary = (metric: string) => {
    const row = summary?.find((entry) => entry.metric === metric);
    return { value: Number(row?.value ?? 0), previous: Number(row?.previous ?? 0) };
  };

  return {
    daily: [...byDay.entries()]
      .map(([day, values]) => ({ day, ...values }))
      .sort((a, b) => a.day.localeCompare(b.day)),
    totals: {
      menuViews: readSummary("menu_views").value,
      itemViews: readSummary("item_views").value,
      categoryViews: readSummary("category_views").value,
      qrScans: readSummary("qr_scans").value,
      menuViewsPrevious: readSummary("menu_views").previous,
    },
    topItems: topItems ?? [],
  };
}

export { EMPTY_DAYS };
