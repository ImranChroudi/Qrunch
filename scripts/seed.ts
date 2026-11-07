import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { publicSupabaseEnv, serviceRoleKey, siteUrl } from "../src/lib/env";

async function main() {
  const { url } = publicSupabaseEnv();
  const admin = createClient<Database>(url, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim() || "owner@pizza-house.ma";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD?.trim() || "ChangeMe123!";
  const restaurantName = process.env.SEED_RESTAURANT_NAME?.trim() || "Pizza House Tanger";

  let userId: string | undefined;

  const { data: existingUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  const match = existingUsers?.users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());
  if (match) {
    userId = match.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
  }
  const { error: rpcError } = await admin.rpc("provision_restaurant", {
    p_user_id: userId,
    p_restaurant_name: restaurantName,
  });
  if (rpcError) {
    console.warn("provision_restaurant warning:", rpcError.message);
  }

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, slug")
    .limit(1)
    .maybeSingle();

  if (!restaurant) throw new Error("Restaurant not found after seed");

  const { data: categories } = await admin
    .from("categories")
    .select("id,name")
    .eq("restaurant_id", restaurant.id);

  const catMap = new Map((categories ?? []).map((c) => [c.name.toLowerCase(), c.id]));

  const upsertCat = async (name: string, emoji: string, order: number) => {
    if (catMap.has(name.toLowerCase())) return catMap.get(name.toLowerCase())!;
    const { data } = await admin
      .from("categories")
      .insert({
        restaurant_id: restaurant.id,
        name,
        emoji,
        display_order: order,
        is_active: true,
      })
      .select("id")
      .single();
    return data!.id;
  };

  const pizzasId = await upsertCat("Pizzas", "🍕", 1);
  const burgersId = await upsertCat("Burgers", "🍔", 2);
  const pastaId = await upsertCat("Pasta", "🍝", 3);
  const saladsId = await upsertCat("Salads", "🥗", 4);
  const dessertsId = await upsertCat("Desserts", "🍰", 5);
  const drinksId = await upsertCat("Drinks", "☕", 6);

  await admin.from("menu_items").delete().eq("restaurant_id", restaurant.id);

  const items = [
    {
      category_id: pizzasId,
      name: "Margherita",
      description: "Tomato, mozzarella, fresh basil",
      price: 40,
      is_featured: true,
      is_available: true,
    },
    {
      category_id: pizzasId,
      name: "Pepperoni",
      description: "Tomato, mozzarella, spicy pepperoni",
      price: 55,
      is_featured: true,
      is_available: true,
    },
    { category_id: burgersId, name: "Chicken Burger", description: "Grilled chicken, lettuce, tomato, special sauce", price: 45, is_featured: true, is_available: true },
    { category_id: burgersId, name: "Beef Burger", description: "Beef patty, cheddar, onion, pickles", price: 50, is_available: true },
    { category_id: pastaId, name: "Spaghetti Bolognese", description: "Classic beef ragù", price: 48, is_available: true },
    { category_id: saladsId, name: "Caesar Salad", description: "Romaine, croutons, parmesan, Caesar dressing", price: 38, is_available: true },
    { category_id: dessertsId, name: "Chocolate Fondant", description: "Warm chocolate cake with molten center", price: 32, is_available: true },
    { category_id: drinksId, name: "Fresh Orange Juice", description: "100% squeezed orange", price: 20, is_available: true },
  ];

  const { error: itemsError } = await admin.from("menu_items").insert(
    items.map((item, idx) => ({
      ...item,
      restaurant_id: restaurant.id,
      display_order: idx + 1,
      is_active: true,
      is_featured: item.is_featured ?? false,
      tags: [],
    })),
  );
  if (itemsError) throw new Error(`menu_items insert failed: ${itemsError.message}`);

  const menuUrl = `${siteUrl}/menu/${restaurant.slug}`;

  console.log("=== Seed complete ===");
  console.log(`Admin email: ${adminEmail}`);
  console.log(`Admin password: ${adminPassword}`);
  console.log(`Restaurant: ${restaurantName}`);
  console.log(`Menu URL: ${menuUrl}`);
  console.log(`Slug: ${restaurant.slug}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
