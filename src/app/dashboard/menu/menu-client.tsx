"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, GripVertical, ImageIcon, ListOrdered, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { createMenuItem, deleteMenuItem, reorderMenuItems, updateMenuItem } from "../actions/menu-items";
import { MENU_SORTS, type MenuFilters, type MenuItemWithCategory, type MenuSort } from "@/lib/data/menu-filters";
import type { Category } from "@/types/database";
import { ImageUploader } from "@/components/uploads/image-uploader";
import { SwitchInput } from "@/components/forms/switch-input";
import { formatPrice } from "@/lib/money";
import { translationValue } from "@/lib/i18n";
import { useAdminT } from "@/components/dashboard/admin-locale-provider";
import { cn } from "@/lib/utils";

type FilterPatch = Record<string, string | null>;

function DeleteItemButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();
  const t = useAdminT();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          {t("common.delete")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("menu.deleteConfirm")}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{name}&quot;? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await deleteMenuItem(id);
                if (result.status === "error") toast.error(result.message || t("common.saveFailed"));
                else if (result.status === "success") toast.success(result.message || t("menu.deleted"));
              });
            }}
          >
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SortableReorderRow({ item }: { item: MenuItemWithCategory }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-dragging={isDragging}
      className="flex items-center gap-3 border-b border-border/60 bg-card px-3 py-3 last:border-b-0"
    >
      <Button
        variant="ghost"
        size="icon"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </Button>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {item.categories?.emoji ?? "•"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="text-xs text-muted-foreground">{formatPrice(item.price)}</p>
      </div>
    </div>
  );
}

function ReorderPanel({
  items: initial,
  onDone,
}: {
  items: MenuItemWithCategory[];
  onDone: () => void;
}) {
  const t = useAdminT();
  const [items, setItems] = useState(initial);
  const [isSaving, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    const active = event.active as { id: string };
    const over = event.over as { id: string } | null;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    startTransition(async () => {
      const result = await reorderMenuItems(next.map((i) => i.id));
      if (result.status === "error") toast.error(result.message || t("common.saveFailed"));
      else if (result.status === "success") toast.success(result.message || t("common.saveChanges"));
    });
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>{t("menu.reorderTitle")}</CardTitle>
          <CardDescription>{t("menu.reorderHint")}</CardDescription>
        </div>
        <Button variant="outline" onClick={onDone} disabled={isSaving}>
          {t("common.done")}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border border-border/60">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <SortableReorderRow key={item.id} item={item} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            This category has no items yet.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function MenuClient({
  items,
  total,
  page,
  perPage,
  categories,
  filters,
  reorderItems,
}: {
  items: MenuItemWithCategory[];
  total: number;
  page: number;
  perPage: number;
  categories: Category[];
  filters: {
    search?: string;
    categoryId?: string;
    availability: MenuFilters["availability"];
    featured: boolean;
    sort: MenuSort;
  };
  reorderItems: MenuItemWithCategory[] | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useAdminT();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItemWithCategory | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string>("");
  const [searchValue, setSearchValue] = useState(filters.search ?? "");
  const [isSaving, startTransition] = useTransition();

  const updateParams = useCallback(
    (patch: FilterPatch) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // Debounced server-side search; resets to the first page on every change.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (searchValue !== (filters.search ?? "")) {
        updateParams({ q: searchValue.trim() || null, page: null });
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [searchValue, filters.search, updateParams]);

  const hasFilters =
    Boolean(filters.search) ||
    Boolean(filters.categoryId) ||
    (filters.availability ?? "all") !== "all" ||
    filters.featured;

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const rangeFrom = total === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeTo = Math.min(total, page * perPage);

  const canReorder =
    Boolean(filters.categoryId) && filters.sort === "display_order" && !filters.search;

  const openCreate = useCallback(() => {
    setEditing(null);
    setImageUrl(null);
    setCategoryId(filters.categoryId ?? categories[0]?.id ?? "");
    setDialogOpen(true);
  }, [categories, filters.categoryId]);

  function openEdit(item: MenuItemWithCategory) {
    setEditing(item);
    setImageUrl(item.image_url);
    setCategoryId(item.category_id ?? categories[0]?.id ?? "");
    setDialogOpen(true);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    if (imageUrl) formData.set("imageUrl", imageUrl);
    else formData.delete("imageUrl");
    if (editing) formData.set("id", editing.id);
    startTransition(async () => {
      const result = editing ? await updateMenuItem(formData) : await createMenuItem(formData);
      if (result.status === "error") {
        toast.error(result.message || t("common.saveFailed"));
        return;
      }
      if (result.status === "success") {
        toast.success(result.message || (editing ? t("menu.updated") : t("menu.created")));
        setDialogOpen(false);
        form.reset();
      }
    });
  }

  const noCategories = categories.length === 0;
  const activeCategory = useMemo(
    () => categories.find((category) => category.id === filters.categoryId),
    [categories, filters.categoryId],
  );

  if (reorderItems) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("menu.pageTitle")}</h1>
          <p className="text-muted-foreground">
            Reordering{activeCategory ? ` “${activeCategory.name}”` : ""}.
          </p>
        </div>
        <ReorderPanel
          items={reorderItems}
          onDone={() => updateParams({ reorder: null })}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("menu.pageTitle")}</h1>
          <p className="text-muted-foreground">{t("menu.pageSubtitle")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} disabled={noCategories}>
              <Plus className="mr-2 h-4 w-4" />
              {t("menu.addItem")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? t("menu.edit") : t("menu.new")}</DialogTitle>
            </DialogHeader>
            <form key={editing?.id ?? "new"} onSubmit={onSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">Name (French)</Label>
                  <Input id="name" name="name" defaultValue={editing?.name} required maxLength={140} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="nameAr">Name (Arabic)</Label>
                  <Input
                    id="nameAr"
                    name="nameAr"
                    dir="rtl"
                    defaultValue={translationValue(editing?.translations, "ar", "name")}
                    maxLength={140}
                    placeholder="الاسم بالعربية"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="description">Description (French, optional)</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={editing?.description ?? ""}
                    maxLength={1000}
                    rows={3}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="descriptionAr">Description (Arabic, optional)</Label>
                  <Textarea
                    id="descriptionAr"
                    name="descriptionAr"
                    dir="rtl"
                    defaultValue={translationValue(editing?.translations, "ar", "description")}
                    maxLength={1000}
                    rows={3}
                    placeholder="الوصف بالعربية"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    name="price"
                    inputMode="decimal"
                    defaultValue={editing ? String(editing.price) : ""}
                    placeholder="45"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("menu.selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.emoji ? `${category.emoji} ` : ""}
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="categoryId" value={categoryId} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="tags">Tags (optional)</Label>
                  <Input
                    id="tags"
                    name="tags"
                    defaultValue={editing?.tags?.join(", ") ?? ""}
                    placeholder="spicy, vegetarian"
                  />
                  <p className="text-xs text-muted-foreground">Comma separated, up to 8.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Available</Label>
                  <SwitchInput
                    name="isAvailable"
                    label={t("menu.available")}
                    defaultChecked={editing ? editing.is_available : true}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("menu.featured")}</Label>
                  <SwitchInput
                    name="isFeatured"
                    label={t("menu.featuredOnly")}
                    defaultChecked={editing ? editing.is_featured : false}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Active</Label>
                  <SwitchInput
                    name="isActive"
                    label={t("settings.published")}
                    defaultChecked={editing ? editing.is_active : true}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Item image (optional)</Label>
                <ImageUploader kind="menuItem" currentUrl={imageUrl} onUploaded={setImageUrl} />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isSaving || !categoryId}>
                  {isSaving ? t("common.saving") : t("menu.save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {noCategories ? (
        <Card className="border-border/60">
          <CardContent className="py-6 text-sm text-muted-foreground">
            Create a category first before adding menu items.
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={t("menu.searchPlaceholder")}
              className="pl-9"
              aria-label={t("menu.search")}
            />
          </div>

          <Select
            value={filters.categoryId ?? "all"}
            onValueChange={(value) =>
              updateParams({ category: value === "all" ? null : value, page: null, reorder: null })
            }
          >
            <SelectTrigger className="w-44" aria-label={t("menu.filterCategory")}>
              <SelectValue placeholder={t("common.category")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("menu.allCategories")}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.emoji ? `${category.emoji} ` : ""}
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.availability ?? "all"}
            onValueChange={(value) =>
              updateParams({ availability: value === "all" ? null : value, page: null })
            }
          >
            <SelectTrigger className="w-40" aria-label={t("menu.filterAvailability")}>
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              {(["all", "available", "unavailable", "hidden"] as const).map((value) => (
                <SelectItem key={value} value={value}>
                  {value === "all"
                    ? t("menu.allStatus")
                    : value === "available"
                      ? t("menu.available")
                      : value === "unavailable"
                        ? t("menu.outOfStock")
                        : t("menu.hidden")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.sort}
            onValueChange={(value) => updateParams({ sort: value, page: null, reorder: null })}
          >
            <SelectTrigger className="w-44" aria-label={t("menu.sort")}>
              <SelectValue placeholder={t("common.sort")} />
            </SelectTrigger>
            <SelectContent>
              {MENU_SORTS.map((sort) => (
                <SelectItem key={sort} value={sort}>
                  {sort === "display_order"
                    ? t("menu.customOrder")
                    : sort === "name"
                      ? t("menu.nameAsc")
                      : sort === "price_asc"
                        ? t("menu.priceLow")
                        : sort === "price_desc"
                          ? t("menu.priceHigh")
                          : t("menu.newest")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex h-9 items-center gap-2 rounded-md border px-3">
            <Switch
              checked={filters.featured}
              onCheckedChange={(checked) =>
                updateParams({ featured: checked ? "1" : null, page: null })
              }
              aria-label={t("menu.featuredOnly")}
            />
            <span className="text-sm text-muted-foreground">{t("menu.featured")}</span>
          </div>

          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                updateParams({
                  q: null,
                  category: null,
                  availability: null,
                  featured: null,
                  sort: null,
                  page: null,
                  reorder: null,
                })
              }
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          ) : null}

          {canReorder ? (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => updateParams({ reorder: "1" })}
            >
              <ListOrdered className="mr-2 h-4 w-4" />
              Reorder
            </Button>
          ) : null}
        </div>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>{t("menu.title")}</CardTitle>
            <CardDescription>
              {t("menu.itemsFound", { count: total })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("menu.item")}</TableHead>
                    <TableHead>{t("common.category")}</TableHead>
                    <TableHead>{t("common.price")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                              <Image
                                src={item.image_url}
                                alt={item.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.is_featured ? (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {t("menu.featured")}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.categories?.emoji ? `${item.categories.emoji} ` : ""}
                        {item.categories?.name ?? "-"}
                      </TableCell>
                      <TableCell>{formatPrice(item.price)}</TableCell>
                      <TableCell>
                        {!item.is_active ? (
                          <Badge variant="secondary">Hidden</Badge>
                        ) : item.is_available ? (
                          <Badge>Available</Badge>
                        ) : (
                          <Badge variant="destructive">Out of stock</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("common.edit")}
                          </Button>
                          <DeleteItemButton id={item.id} name={item.name} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        {hasFilters
                          ? t("menu.noMatch")
                          : t("menu.noItems")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {t("menu.showing", { from: rangeFrom, to: rangeTo, total })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => updateParams({ page: String(page - 1) })}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("menu.previous")}
                </Button>
                <span className={cn("text-sm text-muted-foreground", "tabular-nums")}>
                  {t("menu.pageOf", { page: Math.min(page, totalPages), total: totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => updateParams({ page: String(page + 1) })}
                >
                  {t("menu.next")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
