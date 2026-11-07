import { z } from "zod";

/**
 * Shared primitives. Every rule here has a database counterpart: the schema
 * carries CHECK constraints for the same bounds, so a bug in the form layer
 * still cannot corrupt a row.
 */

const trimmed = (max: number) => z.string().trim().max(max);

/** Accepts `45`, `45.5`, `45,50`, ` 45 DH ` and rejects nonsense. */
export const priceSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim().replace(/\s*(dh|mad|€|eur|\$|usd)\s*$/i, "").replace(",", "."))
  .refine((value) => /^\d{1,6}(\.\d{1,2})?$/.test(value), {
    message: "Enter a valid amount (e.g. 45 or 45.90)",
  })
  .transform((value) => Number.parseFloat(value))
  .refine((value) => Number.isFinite(value) && value >= 0, {
    message: "Price cannot be negative",
  })
  .refine((value) => value <= 999_999.99, {
    message: "Price is too large",
  });

export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour such as #b45309");

export const optionalUrlSchema = z
  .union([z.literal(""), z.string().trim()])
  .transform((value) => (value === "" ? null : value))
  .refine(
    (value) =>
      value === null ||
      /^https:\/\/[^\s]+$/i.test(value) ||
      /^https:\/\/(www\.)?(instagram|facebook)\.com\/[^\s]+$/i.test(value),
    { message: "Enter a full https:// link" },
  );

export const nullableText = (max: number) =>
  trimmed(max)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .catch(null);

/** Slugs are generated server-side; this only validates an admin override. */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Too short")
  .max(80, "Too long")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes only");

export const uuidSchema = z.string().uuid("Invalid identifier");

export const tagsSchema = z
  .array(trimmed(24))
  .max(8, "Up to 8 tags")
  .transform((tags) => [...new Set(tags.map((tag) => tag.toLowerCase()).filter(Boolean))])
  .catch([]);

/**
 * Checkbox/switch values reach the server as text: `"true"`/`"false"` from the
 * hidden inputs that back our Switch component, `"on"` from native checkboxes.
 * Anything that is not an explicit truthy token is treated as off.
 */
export const booleanFromForm = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    return ["on", "true", "1", "yes"].includes(value.trim().toLowerCase());
  });

/** Turns a ZodError into `{ "field.path[0]": "message" }` for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}

export const optionalTrimmed = (max: number) =>
  trimmed(max)
    .transform((value) => (value === "" ? undefined : value))
    .optional();
