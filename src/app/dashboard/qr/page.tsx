import { getAdminContext } from "@/lib/data/admin";
import { siteUrl } from "@/lib/env";
import { QRClient } from "./qr-client";

export default async function QRPage() {
  const { restaurant } = await getAdminContext();
  const menuUrl = `${siteUrl}/menu/${restaurant.slug}`;

  return (
    <QRClient
      menuUrl={menuUrl}
      restaurantName={restaurant.name}
      isPublished={restaurant.is_published}
      primaryColor={restaurant.primary_color}
    />
  );
}
