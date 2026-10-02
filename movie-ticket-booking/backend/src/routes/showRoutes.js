const express = require("express");

const {
  createShow,
  getShows,
  getShowById,
  updateShow,
  deleteShow,
} = require("../controllers/showController");

const authenticateToken = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");

const router = express.Router();

// Public
router.get("/", getShows);
router.get("/:id", getShowById);

// Admin
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  createShow
);

router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  updateShow
);

router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  deleteShow
);

module.exports = router;