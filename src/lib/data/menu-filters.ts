import type { Category, MenuItem } from "@/types/database";

/**
 * Menu listing constants and types shared by the server data layer and the
 * client dashboard. This module deliberately has no `server-only` import so
 * client components can use `MENU_SORTS` without pulling in the server code.
 */

export const MENU_SORTS = [
  "display_order",
  "name",
  "price_asc",
  "price_desc",
  "newest",
] as const;

export type MenuSort = (typeof MENU_SORTS)[number];

export type MenuItemWithCategory = MenuItem & {
  categories: Pick<Category, "id" | "name" | "emoji"> | null;
};

export type MenuFilters = {
  search?: string;
  categoryId?: string;
  availability?: "all" | "available" | "unavailable" | "hidden";
  featured?: boolean;
  sort?: MenuSort;
  page?: number;
  perPage?: number;
};

export const MENU_PAGE_SIZE = 20;