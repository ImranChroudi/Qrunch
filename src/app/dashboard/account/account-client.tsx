"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changePassword, signOutAction, updateProfile } from "../actions/restaurant";
import { toast } from "sonner";
import { useAdminT } from "@/components/dashboard/admin-locale-provider";
import { LogOut, ShieldCheck, UserCircle } from "lucide-react";

const LOCALES = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
] as const;

function FieldError({ errors, field }: { errors: Record<string, string>; field: string }) {
  if (!errors[field]) return null;
  return <p className="text-xs text-destructive">{errors[field]}</p>;
}

export function AccountClient({
  email,
  fullName,
  locale,
  role,
  restaurantName,
}: {
  email: string;
  fullName: string | null;
  locale: string;
  role: string;
  restaurantName: string;
}) {
  const [profileLocale, setProfileLocale] = useState(locale);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isSavingProfile, startProfileTransition] = useTransition();
  const [isSavingPassword, startPasswordTransition] = useTransition();
  const t = useAdminT();

  function onProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("locale", profileLocale);
    startProfileTransition(async () => {
      const result = await updateProfile(formData);
      if (result.status === "error") {
        setProfileErrors(result.errors);
        toast.error(result.message || t("common.saveFailed"));
        return;
      }
      if (result.status === "success") {
        setProfileErrors({});
        toast.success(result.message || t("account.profileUpdated"));
      }
    });
  }

  function onPasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startPasswordTransition(async () => {
      const result = await changePassword(formData);
      if (result.status === "error") {
        setPasswordErrors(result.errors);
        toast.error(result.message || t("common.saveFailed"));
        return;
      }
      if (result.status === "success") {
        setPasswordErrors({});
        toast.success(result.message || t("account.passwordUpdated"));
        form.reset();
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("account.title")}</h1>
        <p className="text-muted-foreground">{t("account.profile")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{t("account.profile")}</CardTitle>
              <CardDescription>{t("account.email")}</CardDescription>
            </div>
            <UserCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("account.email")}</Label>
              <Input id="email" value={email} readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">{t("account.name")}</Label>
              <Input
                id="fullName"
                name="fullName"
                defaultValue={fullName ?? ""}
                maxLength={120}
                placeholder={t("account.name")}
              />
              <FieldError errors={profileErrors} field="fullName" />
            </div>
            <div className="space-y-2">
              <Label>{t("account.language")}</Label>
              <Select value={profileLocale} onValueChange={setProfileLocale}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCALES.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="locale" value={profileLocale} />
              <FieldError errors={profileErrors} field="locale" />
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{role}</Badge>
              <span>{t("account.restaurant")}: {restaurantName}</span>
            </div>
            <form onSubmit={onProfileSubmit}>
              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? t("common.saving") : t("account.saveProfile")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{t("account.password")}</CardTitle>
              <CardDescription>{t("account.password")}</CardDescription>
            </div>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={onPasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t("account.newPassword")}</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  maxLength={72}
                />
                <FieldError errors={passwordErrors} field="newPassword" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("account.confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  maxLength={72}
                />
                <FieldError errors={passwordErrors} field="confirmPassword" />
              </div>
              <Button type="submit" disabled={isSavingPassword}>
                {isSavingPassword ? t("common.saving") : t("account.password")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <p className="text-sm font-medium">{t("account.signOut")}</p>
            <p className="text-xs text-muted-foreground">
              {t("account.signOut")}
            </p>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              {t("account.signOut")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
