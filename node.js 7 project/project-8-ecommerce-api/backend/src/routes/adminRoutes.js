import { Router } from "express";

import {
  getDashboard,
  getSalesReport,
  getProductReport,
  getCustomerReport,
  getOrderReport
} from "../controllers/adminController.js";

import {
  authenticate,
  requireRole
} from "../middleware/auth.js";

const router = Router();

router.use(authenticate);
router.use(requireRole("ADMIN"));

router.get(
  "/dashboard", 
  getDashboard
);

router.get(
  "/sales", 
  getSalesReport
);

router.get(
  "/products", 
  getProductReport
);

router.get(
  "/customers", 
  getCustomerReport
);

router.get(
  "/orders", 
  getOrderReport
);

export default router;