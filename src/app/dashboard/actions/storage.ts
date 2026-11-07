"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/data/admin";
import { ACCEPTED_IMAGE_TYPES, UPLOAD_LIMITS, type UploadKind } from "@/lib/storage";
import { failure, success, type ActionResult } from "@/lib/action-result";

const ALLOWED_TYPES = new Set(ACCEPTED_IMAGE_TYPES);

export async function uploadRestaurantImage(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  try {
    const { restaurant } = await getAdminContext();
    const file = formData.get("file");
    const kind = formData.get("kind") as UploadKind | null;

    if (!(file instanceof File)) {
      return failure("Please select an image file");
    }
    if (!kind || !(kind in UPLOAD_LIMITS)) {
      return failure("Invalid upload target");
    }

    const limit = UPLOAD_LIMITS[kind];
    if (!ALLOWED_TYPES.has(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      return failure("Unsupported image format. Use JPG, PNG, WebP or AVIF.");
    }
    if (file.size > limit.maxBytes) {
      return failure(`Image is too large. Max ${Math.round(limit.maxBytes / (1024 * 1024))}MB.`);
    }

    const supabase = await createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${restaurant.id}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(limit.bucket)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return failure(uploadError.message || "Upload failed");
    }

    const { data: publicData } = supabase.storage.from(limit.bucket).getPublicUrl(path);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    revalidatePath(`/menu/${restaurant.slug}`);

    return success({ url: publicData.publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return failure(message);
  }
}
