import { z } from "zod";

export const createReviewSchema = z.object({
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must not exceed 5"),

  comment: z
    .string()
    .trim()
    .max(1000, "Comment must not exceed 1000 characters")
    .optional()
    .nullable()
});

export const updateReviewSchema = z.object({
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must not exceed 5"),

  comment: z
    .string()
    .trim()
    .max(1000, "Comment must not exceed 1000 characters")
    .optional()
    .nullable()
});