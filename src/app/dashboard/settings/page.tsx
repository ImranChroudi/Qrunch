import { getAdminContext } from "@/lib/data/admin";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const { restaurant } = await getAdminContext();

  return <SettingsClient restaurant={restaurant} />;
}
