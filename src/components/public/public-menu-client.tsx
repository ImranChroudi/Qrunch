"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Search, MapPin, Phone, MessageCircle, Instagram, Facebook, Clock, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/money";
import {
  dirFor,
  isContentLocale,
  LANGUAGE_COOKIE_KEY,
  LANGUAGE_STORAGE_KEY,
  localeTag,
  localized,
  menuStrings,
  type ContentLocale,
} from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/public/language-switcher";
import type { PublicMenu } from "@/lib/data/public-menu";
import { createClient } from "@/lib/supabase/client";

export function PublicMenuClient({
  menu,
  initialLocale,
  brandStyle,
}: {
  menu: PublicMenu;
  initialLocale: ContentLocale;
  brandStyle?: React.CSSProperties;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(menu.categories[0]?.id ?? "");
  const [locale, setLocale] = useState<ContentLocale>(initialLocale);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const supabase = createClient();

  // Adopt a previously saved choice from localStorage if it differs from SSR.
  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isContentLocale(stored) && stored !== initialLocale) setLocale(stored);
  }, [initialLocale]);

  // Persist the selection and flip the document direction for proper RTL.
  useEffect(() => {
    document.documentElement.lang = localeTag(locale);
    document.documentElement.dir = dirFor(locale);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
    document.cookie = `${LANGUAGE_COOKIE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);

  // Restore the dashboard (LTR) when leaving the public menu.
  useEffect(
    () => () => {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
    },
    [],
  );

  const strings = menuStrings(locale);

  const restaurantName =
    localized(menu.restaurant.translations, locale, "name", menu.restaurant.name) ?? menu.restaurant.name;
  const restaurantDesc = localized(menu.restaurant.translations, locale, "description", menu.restaurant.description);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return menu.categories;
    const term = search.toLowerCase();
    return menu.categories
      .map((category) => ({
        ...category,
        menu_items: category.menu_items.filter((item) => {
          const name = localized(item.translations, locale, "name", item.name)?.toLowerCase() ?? item.name.toLowerCase();
          const desc = localized(item.translations, locale, "description", item.description)?.toLowerCase() ?? "";
          return name.includes(term) || desc.includes(term) || item.tags.some((tag) => tag.includes(term));
        }),
      }))
      .filter((category) => category.menu_items.length > 0);
  }, [menu.categories, search, locale]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("src") || "direct";
    void supabase.rpc("record_menu_view", {
      p_restaurant_id: menu.restaurant.id,
      p_event: "menu_view",
      p_source: source,
    });
  }, [menu.restaurant.id, supabase]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-section");
            if (id) setActiveCategory(id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0.1 },
    );

    for (const id of menu.categories.map((c) => c.id)) {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [menu.categories]);

  const scrollToCategory = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveCategory(id);
    }
  };

  return (
    <div
      dir={dirFor(locale)}
      lang={localeTag(locale)}
      style={brandStyle}
      className="mx-auto flex min-h-screen max-w-3xl flex-col bg-background text-foreground"
    >
      <header className="relative">
        {menu.restaurant.cover_url ? (
          <div className="relative h-48 w-full overflow-hidden sm:h-64">
            <Image
              src={menu.restaurant.cover_url}
              alt={`${restaurantName} cover`}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background" />
          </div>
        ) : null}
        <div className={cn("relative z-10 px-4 pb-4 sm:px-6", menu.restaurant.cover_url ? "-mt-16" : "pt-8")}>
          <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-start">
            {menu.restaurant.logo_url ? (
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-4 border-background bg-background shadow-lg">
                <Image
                  src={menu.restaurant.logo_url}
                  alt={`${restaurantName} logo`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{restaurantName}</h1>
              {restaurantDesc ? (
                <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{restaurantDesc}</p>
              ) : null}
              <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground sm:justify-start">
                {menu.restaurant.address ? (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{menu.restaurant.address}</span>
                  </div>
                ) : null}
                {menu.restaurant.opening_hours ? (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{menu.restaurant.opening_hours}</span>
                  </div>
                ) : null}
                {menu.restaurant.phone ? (
                  <a href={`tel:${menu.restaurant.phone}`} className="flex items-center gap-1.5 hover:text-primary">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{menu.restaurant.phone}</span>
                  </a>
                ) : null}
                {menu.restaurant.whatsapp ? (
                  <a
                    href={`https://wa.me/${menu.restaurant.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-primary"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>{strings.whatsapp}</span>
                  </a>
                ) : null}
                {menu.restaurant.instagram ? (
                  <a
                    href={menu.restaurant.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-primary"
                  >
                    <Instagram className="h-3.5 w-3.5" />
                    <span>Instagram</span>
                  </a>
                ) : null}
                {menu.restaurant.facebook ? (
                  <a
                    href={menu.restaurant.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-primary"
                  >
                    <Facebook className="h-3.5 w-3.5" />
                    <span>Facebook</span>
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={strings.searchPlaceholder}
                className="ps-10 pe-10"
              />
              {search ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute end-1 top-1/2 h-7 w-7 -translate-y-1/2"
                  onClick={() => setSearch("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            <LanguageSwitcher value={locale} onChange={setLocale} />
          </div>
          <div className="no-scrollbar -mx-4 flex overflow-x-auto px-4 sm:-mx-6 sm:px-6">
            <div className="flex gap-2">
              {menu.categories.map((category) => {
                const active = activeCategory === category.id;
                const name = localized(category.translations, locale, "name", category.name) ?? category.name;
                return (
                  <Button
                    key={category.id}
                    variant={active ? "default" : "secondary"}
                    size="sm"
                    className={cn("whitespace-nowrap shadow-sm", active ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary)] hover:opacity-95" : "")}
                    onClick={() => scrollToCategory(category.id)}
                  >
                    {category.emoji ? <span className="me-1">{category.emoji}</span> : null}
                    {name}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 pb-12 pt-6 sm:px-6">
        <div className="flex flex-col gap-10">
          {filteredCategories.map((category) => {
            const name = localized(category.translations, locale, "name", category.name) ?? category.name;
            const desc = localized(category.translations, locale, "description", category.description);
            return (
              <section
                key={category.id}
                data-section={category.id}
                ref={(el: HTMLDivElement | null) => {
                  sectionRefs.current[category.id] = el;
                }}
                className="scroll-mt-24"
              >
                <div className="mb-4 flex flex-col gap-1">
                  <h2 className="text-lg font-semibold sm:text-xl">{name}</h2>
                  {desc ? <p className="text-sm text-muted-foreground">{desc}</p> : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {category.menu_items.map((item) => {
                    const itemName = localized(item.translations, locale, "name", item.name) ?? item.name;
                    const itemDesc = localized(item.translations, locale, "description", item.description);
                    const unavailable = !item.is_available;
                    return (
                      <Card key={item.id} className={cn("overflow-hidden border-border/60 shadow-sm transition-opacity", unavailable && "opacity-70")}>
                        {item.image_url ? (
                          <div className="relative aspect-video w-full overflow-hidden bg-muted">
                            <Image
                              src={item.image_url}
                              alt={itemName}
                              fill
                              loading="lazy"
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, 50vw"
                            />
                          </div>
                        ) : null}
                        <CardHeader className="gap-1 pb-2">
                          <div className="flex items-start justify-between gap-3">
                            <CardTitle className="text-base sm:text-lg">{itemName}</CardTitle>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-sm font-semibold sm:text-base">
                                {formatPrice(item.price, menu.restaurant.currency, locale)}
                              </span>
                              {item.is_featured ? (
                                <Badge variant="secondary" className="text-xs">
                                  {strings.featured}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          {itemDesc ? <CardDescription className="line-clamp-2 text-sm">{itemDesc}</CardDescription> : null}
                        </CardHeader>
                        <CardContent className="pt-0">
                          {unavailable ? (
                            <Badge variant="destructive" className="text-xs">
                              {strings.unavailable}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-[var(--brand-primary)]/40 text-[var(--brand-primary)]">
                              {strings.available}
                            </Badge>
                          )}
                          {item.tags.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {item.tags.slice(0, 4).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {category.menu_items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{strings.emptyCategory}</p>
                ) : null}
              </section>
            );
          })}
          {filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-lg font-medium">{strings.emptyResults}</p>
              <p className="text-sm text-muted-foreground">{strings.emptyResultsHint}</p>
            </div>
          ) : null}
        </div>
      </main>

      <footer className="border-t px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
        {restaurantName} · {strings.footer}
      </footer>
    </div>
  );
}