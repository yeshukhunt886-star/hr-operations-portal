import { z } from "zod";

export const createOrderSchema = z.object({
  shippingAddress: z.object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100),

    phone: z
      .string()
      .trim()
      .min(7, "Phone number is invalid")
      .max(20),

    address1: z
      .string()
      .trim()
      .min(5, "Address is too short")
      .max(200),

    address2: z
      .string()
      .trim()
      .max(200)
      .optional()
      .nullable(),

    city: z
      .string()
      .trim()
      .min(2)
      .max(100),

    state: z
      .string()
      .trim()
      .min(2)
      .max(100),

    postalCode: z
      .string()
      .trim()
      .min(3)
      .max(20),

    country: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .default("India")
  })
});

export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(500)
    .optional()
});