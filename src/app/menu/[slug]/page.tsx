import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { getPublicMenu } from "@/lib/data/public-menu";
import { brandCssVars } from "@/lib/branding";
import { PublicMenuClient } from "@/components/public/public-menu-client";
import { localized, LANGUAGE_COOKIE_KEY, resolveMenuLocale } from "@/lib/i18n";

type Props = {
  params: Promise<{ slug: string }>;
};

async function currentMenuLocale(restaurantLocale: string | null | undefined) {
  const store = await cookies();
  return resolveMenuLocale(store.get(LANGUAGE_COOKIE_KEY)?.value, restaurantLocale);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);

  if (!menu) return {};

  const locale = await currentMenuLocale(menu.restaurant.locale);
  const name = localized(menu.restaurant.translations, locale, "name", menu.restaurant.name) ?? menu.restaurant.name;
  const description = localized(menu.restaurant.translations, locale, "description", menu.restaurant.description) ?? undefined;

  return {
    title: `${name} · Menu`,
    description,
    robots: menu.restaurant.is_indexable ? "index,follow" : "noindex,nofollow",
    openGraph: {
      title: `${name} · Menu`,
      description,
      images: menu.restaurant.cover_url ? [menu.restaurant.cover_url] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} · Menu`,
      description,
      images: menu.restaurant.cover_url ? [menu.restaurant.cover_url] : undefined,
    },
  };
}

export default async function PublicMenuPage({ params }: Props) {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);

  if (!menu) notFound();

  const initialLocale = await currentMenuLocale(menu.restaurant.locale);
  const brandVars = brandCssVars(menu.restaurant.primary_color, menu.restaurant.secondary_color);

  return (
    <PublicMenuClient
      menu={menu}
      initialLocale={initialLocale}
      brandStyle={brandVars as React.CSSProperties}
    />
  );
}