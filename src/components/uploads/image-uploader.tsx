"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadRestaurantImage } from "@/app/dashboard/actions/storage";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, type UploadKind } from "@/lib/storage";
import { optimizeImage } from "@/lib/image-optimization";
import { toast } from "sonner";

export function ImageUploader({
  kind,
  currentUrl,
  onUploaded,
}: {
  kind: UploadKind;
  currentUrl?: string | null;
  onUploaded: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [isPending, startTransition] = useTransition();

  const limits = {
    logo: MAX_UPLOAD_BYTES.logo,
    cover: MAX_UPLOAD_BYTES.cover,
    category: MAX_UPLOAD_BYTES.category,
    menuItem: MAX_UPLOAD_BYTES.menuItem,
  }[kind];

  async function onSelect(original: File) {
    if (!ACCEPTED_IMAGE_TYPES.includes(original.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      toast.error("Unsupported image type. Use JPG, PNG, WebP or AVIF.");
      return;
    }
    if (original.size > limits) {
      toast.error(`Image is too large. Max ${Math.round(limits / (1024 * 1024))}MB.`);
      return;
    }

    // Resize/compress to WebP before upload; falls back to the original file.
    const file = await optimizeImage(original);

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("kind", kind);
      const result = await uploadRestaurantImage(formData);
      if (result.status === "error") {
        toast.error(result.message || "Upload failed");
        setPreview(currentUrl ?? null);
        return;
      }
      if (result.status === "success") {
        toast.success("Image uploaded");
        onUploaded(result.data.url);
        return;
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "relative flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/40",
          preview ? "p-0" : "p-6",
        )}
      >
        {preview ? (
          <Image src={preview} alt="Preview" fill className="object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
            <Upload className="h-6 w-6" />
            <p className="text-sm font-medium">Drop or select an image</p>
            <p className="text-xs">
              JPG, PNG, WebP, AVIF · Max {Math.round(limits / (1024 * 1024))}MB
            </p>
          </div>
        )}
        {isPending ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
        >
          {currentUrl ? "Replace image" : "Upload image"}
        </Button>
        {currentUrl || preview ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setPreview(null);
              onUploaded(null);
            }}
            disabled={isPending}
          >
            <X className="mr-2 h-4 w-4" />
            Remove
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onSelect(file);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
