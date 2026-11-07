"use client";

import { useAdminLocale } from "./admin-locale-provider";
import { ADMIN_LOCALES } from "@/lib/admin-i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";

export function AdminLanguageSwitcher() {
  const { locale, setLocale } = useAdminLocale();
  const current = ADMIN_LOCALES.find((entry) => entry.code === locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">{current?.label ?? "Language"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ADMIN_LOCALES.map((entry) => (
          <DropdownMenuItem
            key={entry.code}
            onClick={() => setLocale(entry.code)}
            className={entry.code === locale ? "font-semibold" : ""}
          >
            {entry.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}