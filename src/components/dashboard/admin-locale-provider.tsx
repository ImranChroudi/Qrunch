"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ADMIN_LANGUAGE_COOKIE_KEY,
  ADMIN_LANGUAGE_STORAGE_KEY,
  type AdminLocale,
  adminT,
  dirForAdmin,
  isAdminLocale,
  normaliseAdminLocale,
} from "@/lib/admin-i18n";

type AdminLocaleContextValue = {
  locale: AdminLocale;
  setLocale: (locale: AdminLocale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
};

const AdminLocaleContext = createContext<AdminLocaleContextValue | null>(null);

export function AdminLocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale?: string | null;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<AdminLocale>(normaliseAdminLocale(initialLocale));

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ADMIN_LANGUAGE_STORAGE_KEY);
      if (isAdminLocale(stored)) setLocaleState(stored);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(ADMIN_LANGUAGE_STORAGE_KEY, locale);
    } catch {
      // ignore
    }
    document.cookie = `${ADMIN_LANGUAGE_COOKIE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = locale;
    document.documentElement.dir = dirForAdmin(locale);
  }, [locale]);

  useEffect(() => {
    return () => {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
    };
  }, []);

  const value: AdminLocaleContextValue = {
    locale,
    setLocale: setLocaleState,
    t: (key, vars) => adminT(locale, key, vars),
    dir: dirForAdmin(locale),
  };

  return <AdminLocaleContext.Provider value={value}>{children}</AdminLocaleContext.Provider>;
}

export function useAdminLocale() {
  const ctx = useContext(AdminLocaleContext);
  if (!ctx) throw new Error("useAdminLocale must be used within AdminLocaleProvider");
  return ctx;
}

export function useAdminT() {
  return useAdminLocale().t;
}