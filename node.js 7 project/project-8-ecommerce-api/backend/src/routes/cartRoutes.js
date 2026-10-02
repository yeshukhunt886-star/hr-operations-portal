import { Router } from "express";

import {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart
} from "../controllers/cartController.js";

import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", getCart);

router.post("/items", addCartItem);

router.put("/items/:productId", updateCartItem);

router.delete("/items/:productId", removeCartItem);

router.delete("/", clearCart);

export default router;