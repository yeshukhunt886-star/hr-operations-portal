import { Router } from "express";

import {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview
} from "../controllers/reviewController.js";

import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get(
  "/products/:productId/reviews",
  getProductReviews
);

router.post(
  "/products/:productId/reviews",
  authenticate,
  createReview
);

router.put(
  "/products/:productId/reviews",
  authenticate,
  updateReview
);

router.delete(
  "/products/:productId/reviews",
  authenticate,
  deleteReview
);

export default router;