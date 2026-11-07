"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, GripVertical, Edit, Trash2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { createCategory, deleteCategory, reorderCategories, updateCategory } from "../actions/categories";
import type { Category } from "@/types/database";
import { ImageUploader } from "@/components/uploads/image-uploader";
import { SwitchInput } from "@/components/forms/switch-input";
import { translationValue } from "@/lib/i18n";
import { useAdminT } from "@/components/dashboard/admin-locale-provider";

function SortableRow({
  category,
  count,
  onEdit,
}: {
  category: Category;
  count: number;
  onEdit: (category: Category) => void;
}) {
  const t = useAdminT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });

  return (
    <TableRow ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} data-dragging={isDragging}>
      <TableCell>
        <Button variant="ghost" size="icon" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4" />
        </Button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          {category.image_url ? (
            <div className="relative h-10 w-10 overflow-hidden rounded-md border bg-muted">
              <Image src={category.image_url} alt={category.name} fill sizes="40px" className="object-cover" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
            </div>
          )}
          <div>
            <p className="font-medium">{category.name}</p>
            {category.emoji ? <span className="mr-1">{category.emoji}</span> : null}
          </div>
        </div>
      </TableCell>
      <TableCell>{count}</TableCell>
      <TableCell>
        {category.is_active ? <Badge>{t("common.active")}</Badge> : <Badge variant="secondary">{t("common.inactive")}</Badge>}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(category)}>
            <Edit className="mr-2 h-4 w-4" />
            {t("common.edit")}
          </Button>
          <DeleteCategoryButton id={category.id} name={category.name} />
        </div>
      </TableCell>
    </TableRow>
  );
}

function DeleteCategoryButton({ id, name }: { id: string; name: string }) {
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
          <AlertDialogTitle>{t("categories.deleteConfirm")}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{name}&quot;? Items in this category will also be removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await deleteCategory(id);
                if (result.status === "error") toast.error(result.message || t("common.saveFailed"));
                else if (result.status === "success") toast.success(result.message || t("categories.deleted"));
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

export function CategoriesClient({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  const t = useAdminT();
  const [items, setItems] = useState(categories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor));

  useMemo(() => setItems(categories), [categories]);

  function openCreate() {
    setEditing(null);
    setImageUrl(null);
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setImageUrl(cat.image_url);
    setDialogOpen(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const active = event.active as { id: string };
    const over = event.over as { id: string } | null;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const next = arrayMove(items, oldIndex, newIndex);
      setItems(next);
      startTransition(async () => {
        const result = await reorderCategories(next.map((i) => i.id));
        if (result.status === "error") toast.error(result.message || t("common.saveFailed"));
        else if (result.status === "success") toast.success(result.message || t("common.saveChanges"));
      });
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (imageUrl) formData.set("imageUrl", imageUrl);
    else formData.delete("imageUrl");
    if (editing) formData.set("id", editing.id);
    startTransition(async () => {
      const result = editing ? await updateCategory(formData) : await createCategory(formData);
      if (result.status === "error") {
        toast.error(result.message || t("common.saveFailed"));
        return;
      }
      if (result.status === "success") {
        toast.success(result.message || (editing ? t("categories.updated") : t("categories.created")));
      }
      setDialogOpen(false);
      event.currentTarget.reset();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("categories.title")}</h1>
          <p className="text-muted-foreground">{t("categories.subtitle")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t("categories.add")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? t("categories.edit") : t("categories.new")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">{t("categories.nameFr")}</Label>
                  <Input id="name" name="name" defaultValue={editing?.name} required maxLength={80} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="nameAr">{t("categories.nameAr")}</Label>
                  <Input
                    id="nameAr"
                    name="nameAr"
                    dir="rtl"
                    defaultValue={translationValue(editing?.translations, "ar", "name")}
                    maxLength={80}
                    placeholder="الاسم بالعربية"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="description">{t("categories.descFr")}</Label>
                  <Textarea id="description" name="description" defaultValue={editing?.description ?? ""} maxLength={500} rows={3} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="descriptionAr">{t("categories.descAr")}</Label>
                  <Textarea
                    id="descriptionAr"
                    name="descriptionAr"
                    dir="rtl"
                    defaultValue={translationValue(editing?.translations, "ar", "description")}
                    maxLength={500}
                    rows={3}
                    placeholder="الوصف بالعربية"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emoji">{t("categories.emoji")}</Label>
                  <Input id="emoji" name="emoji" defaultValue={editing?.emoji ?? ""} maxLength={16} placeholder="🍕" />
                </div>
                <div className="space-y-2">
                  <Label>{t("common.active")}</Label>
                  <SwitchInput name="isActive" label={t("settings.published")} defaultChecked={editing ? editing.is_active : true} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category image (optional)</Label>
                <ImageUploader kind="category" currentUrl={imageUrl} onUploaded={setImageUrl} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? t("common.saving") : t("categories.save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{t("categories.all")}</CardTitle>
          <CardDescription>{t("categories.dragHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12" />
                    <TableHead>{t("categories.columnCategory")}</TableHead>
                    <TableHead>{t("categories.items")}</TableHead>
                    <TableHead>{t("categories.columnStatus")}</TableHead>
                    <TableHead className="text-right">{t("categories.columnActions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <TableBody>
                    {items.map((category) => (
                      <SortableRow key={category.id} category={category} count={counts[category.id] ?? 0} onEdit={openEdit} />
                    ))}
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                          {t("categories.empty")}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </SortableContext>
              </Table>
            </DndContext>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
