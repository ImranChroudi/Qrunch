"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SwitchInput } from "@/components/forms/switch-input";
import { updateRestaurantSettings } from "../actions/restaurant";
import { toast } from "sonner";
import { useAdminT } from "@/components/dashboard/admin-locale-provider";
import type { Restaurant } from "@/types/database";

const MENU_STYLES = [
  { value: "modern", label: "Modern" },
  { value: "classic", label: "Classic" },
  { value: "minimal", label: "Minimal" },
] as const;

function FieldError({ errors, field }: { errors: Record<string, string>; field: string }) {
  if (!errors[field]) return null;
  return <p className="text-xs text-destructive">{errors[field]}</p>;
}

export function SettingsClient({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter();
  const t = useAdminT();
  const [menuStyle, setMenuStyle] = useState<string>(restaurant.menu_style);
  const [primaryColor, setPrimaryColor] = useState(restaurant.primary_color);
  const [secondaryColor, setSecondaryColor] = useState(restaurant.secondary_color);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("logoUrl", "");
    formData.set("coverUrl", "");
    formData.set("menuStyle", menuStyle);
    formData.set("currency", restaurant.currency);
    formData.set("locale", restaurant.locale);
    formData.set("primaryColor", primaryColor);
    formData.set("secondaryColor", secondaryColor);

    startTransition(async () => {
      const result = await updateRestaurantSettings(formData);
      if (result.status === "error") {
        setErrors(result.errors);
        toast.error(result.message || t("common.saveFailed"));
        return;
      }
      if (result.status === "success") {
        setErrors({});
        toast.success(result.message || t("settings.saved"));
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("settings.title")}</h1>
          <p className="text-muted-foreground">{t("settings.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.open(`/menu/${restaurant.slug}`, "_blank")}
          >
            {t("settings.preview")}
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? t("common.saving") : t("common.saveChanges")}
          </Button>
        </div>
      </div>

      {Object.keys(errors).length > 0 ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            {t("settings.fixErrors")}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>{t("settings.identity")}</CardTitle>
            <CardDescription>{t("settings.identityDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("common.name")}</Label>
              <Input id="name" name="name" defaultValue={restaurant.name} required maxLength={120} />
              <FieldError errors={errors} field="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">{t("settings.slug")}</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/menu/</span>
                <Input id="slug" name="slug" defaultValue={restaurant.slug} required maxLength={80} />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("settings.slugHint")}
              </p>
              <FieldError errors={errors} field="slug" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t("common.description")}</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={restaurant.description ?? ""}
                rows={3}
                maxLength={2000}
              />
              <FieldError errors={errors} field="description" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>{t("settings.branding")}</CardTitle>
            <CardDescription>{t("settings.brandingDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">{t("settings.primaryColor")}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(event) => setPrimaryColor(event.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border bg-transparent"
                  aria-label={t("settings.primaryColor")}
                />
                <Input
                  id="primaryColor"
                  name="primaryColor"
                  value={primaryColor}
                  onChange={(event) => setPrimaryColor(event.target.value)}
                  pattern="^#[0-9a-fA-F]{6}$"
                  maxLength={7}
                  className="w-28"
                />
              </div>
              <FieldError errors={errors} field="primaryColor" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">{t("settings.secondaryColor")}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(event) => setSecondaryColor(event.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border bg-transparent"
                  aria-label={t("settings.secondaryColor")}
                />
                <Input
                  id="secondaryColor"
                  name="secondaryColor"
                  value={secondaryColor}
                  onChange={(event) => setSecondaryColor(event.target.value)}
                  pattern="^#[0-9a-fA-F]{6}$"
                  maxLength={7}
                  className="w-28"
                />
              </div>
              <FieldError errors={errors} field="secondaryColor" />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.menuStyle")}</Label>
              <Select value={menuStyle} onValueChange={setMenuStyle}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MENU_STYLES.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="menuStyle" value={menuStyle} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>{t("settings.contact")}</CardTitle>
            <CardDescription>{t("settings.contactDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">{t("settings.phone")}</Label>
                <Input id="phone" name="phone" defaultValue={restaurant.phone ?? ""} maxLength={40} />
                <FieldError errors={errors} field="phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">{t("settings.whatsapp")}</Label>
                <Input id="whatsapp" name="whatsapp" defaultValue={restaurant.whatsapp ?? ""} maxLength={40} />
                <FieldError errors={errors} field="whatsapp" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">{t("settings.address")}</Label>
              <Textarea id="address" name="address" defaultValue={restaurant.address ?? ""} rows={2} maxLength={400} />
              <FieldError errors={errors} field="address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingHours">{t("settings.openingHours")}</Label>
              <Textarea
                id="openingHours"
                name="openingHours"
                defaultValue={restaurant.opening_hours ?? ""}
                rows={3}
                maxLength={1000}
                placeholder={t("settings.openingHours")}
              />
              <FieldError errors={errors} field="openingHours" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="instagram">{t("settings.instagram")}</Label>
                <Input id="instagram" name="instagram" defaultValue={restaurant.instagram ?? ""} placeholder="https://instagram.com/…" />
                <FieldError errors={errors} field="instagram" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook">{t("settings.facebook")}</Label>
                <Input id="facebook" name="facebook" defaultValue={restaurant.facebook ?? ""} placeholder="https://facebook.com/…" />
                <FieldError errors={errors} field="facebook" />
              </div>
            </div>
          </CardContent>
        </Card>

        <input type="hidden" name="currency" value={restaurant.currency} />
        <input type="hidden" name="locale" value={restaurant.locale} />

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>{t("settings.visibility")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SwitchInput
              name="isPublished"
              label={t("settings.published")}
              defaultChecked={restaurant.is_published}
            />
            <SwitchInput
              name="isIndexable"
              label={t("settings.indexable")}
              defaultChecked={restaurant.is_indexable}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t("common.saving") : t("common.saveChanges")}
        </Button>
      </div>
    </form>
  );
}
