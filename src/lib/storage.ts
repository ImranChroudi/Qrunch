/** Storage buckets — names are created and policy-locked by migration 005. */
export const STORAGE_BUCKETS = {
  logo: "restaurant-logos",
  cover: "restaurant-covers",
  category: "category-images",
  menuItem: "menu-item-images",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/** Mirrors the per-bucket `file_size_limit` in migration 005. */
export const MAX_UPLOAD_BYTES = {
  logo: 2 * 1024 * 1024,
  cover: 6 * 1024 * 1024,
  category: 4 * 1024 * 1024,
  menuItem: 4 * 1024 * 1024,
} as const;

export type UploadKind = keyof typeof STORAGE_BUCKETS;

export const UPLOAD_LIMITS: Record<
  UploadKind,
  { bucket: StorageBucket; maxBytes: number; label: string }
> = {
  logo: {
    bucket: STORAGE_BUCKETS.logo,
    maxBytes: MAX_UPLOAD_BYTES.logo,
    label: "logo",
  },
  cover: {
    bucket: STORAGE_BUCKETS.cover,
    maxBytes: MAX_UPLOAD_BYTES.cover,
    label: "cover image",
  },
  category: {
    bucket: STORAGE_BUCKETS.category,
    maxBytes: MAX_UPLOAD_BYTES.category,
    label: "category image",
  },
  menuItem: {
    bucket: STORAGE_BUCKETS.menuItem,
    maxBytes: MAX_UPLOAD_BYTES.menuItem,
    label: "item photo",
  },
};
