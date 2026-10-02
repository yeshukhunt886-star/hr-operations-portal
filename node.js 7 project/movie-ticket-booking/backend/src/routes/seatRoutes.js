const express = require("express");

const {
  createSeats,
  getSeatsByScreen,
  createShowSeats,
  getSeatsByShow,
} = require("../controllers/seatController");

const authMiddleware = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");

const router = express.Router();

// ADMIN: create physical seats for a screen
router.post(
  "/screen/:screenId",
  authMiddleware,
  requireAdmin,
  createSeats
);

// Public: get physical seats of a screen
router.get(
  "/screen/:screenId",
  getSeatsByScreen
);

// ADMIN: create show-specific seats
router.post(
  "/show/:showId/generate",
  authMiddleware,
  requireAdmin,
  createShowSeats
);

// Public: get seat availability for a show
router.get(
  "/show/:showId",
  getSeatsByShow
);

module.exports = router;