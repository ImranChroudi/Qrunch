import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { publicSupabaseEnv, serviceRoleKey } from "../src/lib/env";

async function main() {
  const { url } = publicSupabaseEnv();
  const admin = createClient<Database>(url, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id,name,slug")
    .limit(1)
    .maybeSingle();

  if (!restaurant) throw new Error("No restaurant found. Run: npm run db:seed");

  const [cats, items, views] = await Promise.all([
    admin.from("categories").select("*", { count: "exact" }).eq("restaurant_id", restaurant.id),
    admin.from("menu_items").select("*", { count: "exact" }).eq("restaurant_id", restaurant.id),
    admin.from("menu_views").select("*", { count: "exact" }).eq("restaurant_id", restaurant.id).limit(1),
  ]);

  console.log("=== Verification ===");
  console.log(`Restaurant: ${restaurant.name} (${restaurant.slug})`);
  console.log(`Categories: ${cats.count ?? 0}`);
  console.log(`Menu items: ${items.count ?? 0}`);
  console.log(`Views table accessible: ${views.error ? "NO" : "YES"}`);
  console.log("✅ Basic integrity OK");
}

main().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
