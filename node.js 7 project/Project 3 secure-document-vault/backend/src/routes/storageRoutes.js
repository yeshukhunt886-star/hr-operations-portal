import express from "express";

import {
  getStorageHealth,
} from "../controllers/storageController.js";

const router = express.Router();

// ==========================================
// STORAGE HEALTH
// ==========================================

router.get("/health", getStorageHealth);

export default router;