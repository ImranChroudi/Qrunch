import {
  listMenuItems,
  listCategories,
  listItemsForReorder,
  MENU_SORTS,
  type MenuFilters,
  type MenuSort,
} from "@/lib/data/admin";
import { MenuClient } from "./menu-client";

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(params: RawSearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseSort(value: string | undefined): MenuSort {
  return MENU_SORTS.includes(value as MenuSort) ? (value as MenuSort) : "display_order";
}

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;

  const search = first(params, "q")?.trim() || undefined;
  const categoryId = first(params, "category") || undefined;
  const availabilityRaw = first(params, "availability");
  const availability: MenuFilters["availability"] =
    availabilityRaw === "available" ||
    availabilityRaw === "unavailable" ||
    availabilityRaw === "hidden"
      ? availabilityRaw
      : "all";
  const featured = first(params, "featured") === "1";
  const sort = parseSort(first(params, "sort"));
  const page = Math.max(1, Number.parseInt(first(params, "page") ?? "1", 10) || 1);
  const reorder = first(params, "reorder") === "1" && categoryId;

  const filters: MenuFilters = {
    search,
    categoryId,
    availability,
    featured,
    sort,
    page,
  };

  const [result, categories, reorderItems] = await Promise.all([
    listMenuItems(filters),
    listCategories(),
    reorder ? listItemsForReorder(categoryId) : Promise.resolve(null),
  ]);

  return (
    <MenuClient
      items={result.items}
      total={result.total}
      page={result.page}
      perPage={result.perPage}
      categories={categories}
      filters={{ search, categoryId, availability, featured, sort }}
      reorderItems={reorderItems}
    />
  );
}
