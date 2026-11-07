import { getAdminContext } from "@/lib/data/admin";
import { AccountClient } from "./account-client";

export default async function AccountPage() {
  const { user, profile, restaurant } = await getAdminContext();

  return (
    <AccountClient
      email={user.email ?? profile.email}
      fullName={profile.full_name}
      locale={profile.locale}
      role={profile.role}
      restaurantName={restaurant.name}
    />
  );
}
