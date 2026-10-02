import { Router } from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} from "../controllers/categoryController.js";
import {
  authenticate,
  requireRole
} from "../middleware/auth.js";

const router = Router();

router.get("/", getCategories);

router.get("/:id", getCategoryById);

router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  createCategory
);

router.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  updateCategory
);

router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  deleteCategory
);

export default router;