import { Router } from "express";

import {
  payOrder,
  getPaymentStatus,
  refundOrder
} from "../controllers/paymentController.js";

import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.post(  
  "/:orderId/pay", 
  payOrder
);

router.get(
  "/:orderId", 
  getPaymentStatus
);

router.post(
  "/:orderId/refund", 
  refundOrder
);

export default router;