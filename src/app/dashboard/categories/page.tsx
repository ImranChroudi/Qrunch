import { listCategories, countItemsPerCategory } from "@/lib/data/admin";
import { CategoriesClient } from "./categories-client";

export default async function CategoriesPage() {
  const [categories, counts] = await Promise.all([
    listCategories(),
    countItemsPerCategory(),
  ]);

  return <CategoriesClient categories={categories} counts={counts} />;
}
