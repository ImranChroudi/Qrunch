import { getAdminContext, getDashboardStats } from "@/lib/data/admin";
import { DashboardHomeClient } from "./dashboard-home-client";

export default async function DashboardPage() {
  const { restaurant } = await getAdminContext();
  const stats = await getDashboardStats();

  return <DashboardHomeClient restaurantName={restaurant.name} stats={stats} />;
}