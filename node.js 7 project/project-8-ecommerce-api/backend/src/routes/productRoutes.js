import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
} from "../controllers/productController.js";
import {
  authenticate,
  requireRole
} from "../middleware/auth.js";

const router = Router();

router.get("/", getProducts);

router.get("/:id", getProductById);

router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  createProduct
);

router.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  updateProduct
);

router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  deleteProduct
);

export default router;