import express from "express";
import {
  getUsersWithOrders,
  getOrderDetails
} from "../controllers/joinController.js";

const router = express.Router();

router.get("/users-orders", getUsersWithOrders);
router.get("/order/:orderId", getOrderDetails);

export default router;