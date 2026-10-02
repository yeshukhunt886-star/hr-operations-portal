const express = require("express");

const {
  createScreen,
  getScreens,
  updateScreen,
  deleteScreen,
} = require("../controllers/screenController");

const authenticateToken = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");

const router = express.Router();

// Public
router.get(
  "/theatre/:theatreId",
  getScreens
);

// Admin
router.post(
  "/theatre/:theatreId",
  authenticateToken,
  requireAdmin,
  createScreen
);

router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  updateScreen
);

router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  deleteScreen
);

module.exports = router;