"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Layers,
  Settings,
  QrCode,
  UserCircle,
  LogOut,
  ChefHat,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LogoutButton } from "@/components/dashboard/logout-button";
import type { Restaurant } from "@/types/database";
import { cn } from "@/lib/utils";
import { useAdminT } from "./admin-locale-provider";
import { AdminLanguageSwitcher } from "./admin-language-switcher";

export function AppSidebar({ restaurant }: { restaurant: Restaurant }) {
  const pathname = usePathname();
  const t = useAdminT();

  const NAV_ITEMS = [
    { label: t("nav.dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { label: t("nav.menu"), href: "/dashboard/menu", icon: UtensilsCrossed },
    { label: t("nav.categories"), href: "/dashboard/categories", icon: Layers },
    { label: t("nav.settings"), href: "/dashboard/settings", icon: Settings },
    { label: t("nav.qr"), href: "/dashboard/qr", icon: QrCode },

    { label: t("nav.account"), href: "/dashboard/account", icon: UserCircle },
  ];

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/90 text-primary-foreground shadow-sm">
          <ChefHat className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{restaurant.name}</p>
          <p className="truncate text-xs text-sidebar-muted">{t("nav.admin")}</p>
        </div>
      </div>
      <Separator className="bg-sidebar-border/60" />
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              className={cn(
                "justify-start gap-3 px-3 text-sm font-medium text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive &&
                  "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm",
              )}
            >
              <Link href={item.href}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          );
        })}
      </nav>
      <div className="px-3 pb-4">
        <div className="mb-3">
          <AdminLanguageSwitcher />
        </div>
        <Separator className="mb-3 bg-sidebar-border/60" />
        <LogoutButton
          className="w-full justify-start gap-3 px-3 text-sm text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          {t("nav.logout")}
        </LogoutButton>
      </div>
    </div>
  );
}
