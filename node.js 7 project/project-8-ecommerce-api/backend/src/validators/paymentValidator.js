import { z } from "zod";

export const paymentSchema = z.object({
  paymentMethod: z.enum([
    "CARD",
    "UPI",
    "NET_BANKING",
    "COD"
  ])
});

export const refundSchema = z.object({
 reason: z
    .string()
    .trim()
    .max(500)
    .optional()
});