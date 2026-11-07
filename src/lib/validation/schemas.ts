import { z } from "zod";

import {
  booleanFromForm,
  hexColorSchema,
  nullableText,
  optionalUrlSchema,
  priceSchema,
  slugSchema,
  tagsSchema,
  uuidSchema,
} from "@/lib/validation/primitives";

const trimmed = (max: number) => z.string().trim().max(max);

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

export const categoryInputSchema = z.object({
  name: trimmed(80).min(1, "Name is required").max(80),
  nameAr: nullableText(80),
  description: nullableText(500),
  descriptionAr: nullableText(500),
  imageUrl: optionalUrlSchema.catch(null),
  emoji: z
    .string()
    .trim()
    .max(16)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .catch(null),
  isActive: booleanFromForm.default(true),
});

export const categoryUpdateSchema = z.object({
  id: uuidSchema,
  ...categoryInputSchema.partial().shape,
});

export type CategoryInput = z.input<typeof categoryInputSchema>;
export type CategoryUpdate = z.input<typeof categoryUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Menu items                                                                  */
/* -------------------------------------------------------------------------- */

export const menuItemInputSchema = z.object({
  name: trimmed(140).min(1, "Name is required").max(140),
  nameAr: nullableText(140),
  description: nullableText(1000),
  descriptionAr: nullableText(1000),
  price: priceSchema,
  categoryId: uuidSchema,
  imageUrl: optionalUrlSchema.catch(null),
  isAvailable: booleanFromForm.default(true),
  isFeatured: booleanFromForm.default(false),
  isActive: booleanFromForm.default(true),
  tags: tagsSchema.default([]),
});

export const menuItemUpdateSchema = z.object({
  id: uuidSchema,
  ...menuItemInputSchema.partial().shape,
});

export type MenuItemInput = z.input<typeof menuItemInputSchema>;
export type MenuItemUpdate = z.input<typeof menuItemUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Restaurant settings                                                         */
/* -------------------------------------------------------------------------- */

export const restaurantSettingsSchema = z.object({
  name: trimmed(120).min(2, "Name is required").max(120),
  slug: slugSchema,
  description: nullableText(2000),
  logoUrl: optionalUrlSchema.catch(null),
  coverUrl: optionalUrlSchema.catch(null),
  phone: nullableText(40),
  whatsapp: nullableText(40),
  address: nullableText(400),
  openingHours: nullableText(1000),
  instagram: optionalUrlSchema.catch(null),
  facebook: optionalUrlSchema.catch(null),
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
  menuStyle: z.enum(["modern", "classic", "minimal"]),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, e.g. MAD"),
  locale: z.string().trim().regex(/^[a-z]{2}(-[a-z]{2})?$/, "Use a locale like en, fr or ar"),
  isPublished: booleanFromForm.default(true),
  isIndexable: booleanFromForm.default(true),
});

export type RestaurantSettingsInput = z.input<typeof restaurantSettingsSchema>;

/* -------------------------------------------------------------------------- */
/* Account                                                                     */
/* -------------------------------------------------------------------------- */

export const profileInputSchema = z.object({
  fullName: nullableText(120),
  locale: z.string().trim().regex(/^[a-z]{2}(-[a-z]{2})?$/),
});

export const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(10, "Use at least 10 characters")
      .max(72, "Maximum 72 characters")
      .regex(/[a-z]/, "Add a lowercase letter")
      .regex(/[A-Z]/, "Add an uppercase letter")
      .regex(/[0-9]/, "Add a number"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const restaurantOnboardingSchema = z.object({
  name: trimmed(120).min(2, "Restaurant name is required").max(120),
  slug: slugSchema.optional(),
});

/* -------------------------------------------------------------------------- */
/* Ordering                                                                    */
/* -------------------------------------------------------------------------- */

export const reorderSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(500),
});

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(320),
  password: z.string().min(1, "Enter your password").max(200),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(320),
});
