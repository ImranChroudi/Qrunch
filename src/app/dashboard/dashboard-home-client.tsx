"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed, Layers, Eye, CheckCircle2, XCircle } from "lucide-react";
import { useAdminT } from "@/components/dashboard/admin-locale-provider";

type Stats = {
  totalItems: number;
  availableItems: number;
  unavailableItems: number;
  hiddenItems: number;
  featuredItems: number;
  activeCategories: number;
  totalCategories: number;
  viewsLast7Days: number;
  viewsLast30Days: number;
};

export function DashboardHomeClient({ restaurantName, stats }: { restaurantName: string; stats: Stats }) {
  const t = useAdminT();

  const statCards = [
    {
      title: t("dashboard.totalItems"),
      value: stats.totalItems,
      description: t("dashboard.totalItemsDesc"),
      icon: UtensilsCrossed,
      trend: t("dashboard.featured", { count: stats.featuredItems }),
    },
    {
      title: t("dashboard.activeItems"),
      value: stats.availableItems,
      description: t("dashboard.activeItemsDesc"),
      icon: CheckCircle2,
      trend: t("dashboard.soldOut", { count: stats.unavailableItems }),
    },
    {
      title: t("dashboard.hiddenUnavailable"),
      value: stats.unavailableItems + stats.hiddenItems,
      description: t("dashboard.hiddenUnavailableDesc"),
      icon: XCircle,
      trend: t("dashboard.hidden", { count: stats.hiddenItems }),
    },
    {
      title: t("dashboard.categories"),
      value: stats.activeCategories,
      description: t("dashboard.categoriesDesc", { total: stats.totalCategories }),
      icon: Layers,
      trend: t("dashboard.displayOrder"),
    },
    {
      title: t("dashboard.views30d"),
      value: stats.viewsLast30Days,
      description: t("dashboard.views30dDesc"),
      icon: Eye,
      trend: t("dashboard.last7d", { count: stats.viewsLast7Days }),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("dashboard.title", { name: restaurantName })}
        </h1>
        <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">{card.trend}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}