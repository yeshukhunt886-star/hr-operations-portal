const express = require("express");

const {
  createTheatre,
  getTheatres,
  getTheatreById,
  updateTheatre,
  deleteTheatre,
} = require("../controllers/theatreController");

const authenticateToken = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");

const router = express.Router();

// Public
router.get("/", getTheatres);
router.get("/:id", getTheatreById);

// Admin
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  createTheatre
);

router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  updateTheatre
);

router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  deleteTheatre
);

module.exports = router;