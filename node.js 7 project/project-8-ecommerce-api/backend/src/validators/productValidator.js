import { z } from "zod";

const priceSchema = z.union([
  z.number().nonnegative(),
  z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/)
]);

export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Product name must be at least 2 characters")
    .max(200, "Product name must not exceed 200 characters"),

  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(200, "Slug must not exceed 200 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain lowercase letters, numbers and hyphens only"
    ),

  description: z
    .string()
    .trim()
    .max(2000, "Description must not exceed 2000 characters")
    .optional(),

  price: priceSchema,

  stock: z
    .number()
    .int()
    .min(0, "Stock cannot be negative"),

  status: z
    .enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK"])
    .optional(),

  categoryId: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional()
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  search: z.string().trim().optional(),

  categoryId: z.coerce
    .number()
    .int()
    .positive()
    .optional(),

  minPrice: z.coerce
    .number()
    .nonnegative()
    .optional(),

  maxPrice: z.coerce
    .number()
    .nonnegative()
    .optional(),

  status: z
    .enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK"])
    .optional(),

  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(10)
});