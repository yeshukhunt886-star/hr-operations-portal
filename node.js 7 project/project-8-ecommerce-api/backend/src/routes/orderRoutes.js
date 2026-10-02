import { Router } from "express";

import {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder
} from "../controllers/orderController.js";

import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.post(
  "/", createOrder
);

router.get(
  "/", getOrders
);

router.get(
  "/:id", getOrderById
);

router.put(
  "/:id/cancel", cancelOrder
);

export default router;