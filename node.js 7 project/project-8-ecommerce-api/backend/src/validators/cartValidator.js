import { z } from "zod";

export const addCartItemSchema = z.object({
  productId: z
    .number()
    .int()
    .positive(),

  quantity: z
    .number()
    .int()
    .positive()
    .max(100, "Quantity cannot exceed 100")
});

export const updateCartItemSchema = z.object({
  quantity: z
    .number()
    .int()
    .positive()
    .max(100, "Quantity cannot exceed 100")
});