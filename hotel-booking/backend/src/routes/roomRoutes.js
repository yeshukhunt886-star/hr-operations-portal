const express = require("express");

const {
  createRoom,
  getRoomsByHotel,
  getRoomById,
  updateRoom,
  deleteRoom,
} = require("../controllers/roomController");

const {
  authenticate,
  requireAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Public
router.get("/hotel/:hotelId", getRoomsByHotel);
router.get("/:id", getRoomById);

// Admin only
router.post(
  "/hotel/:hotelId",
  authenticate,
  requireAdmin,
  createRoom
);

router.put(
  "/:id",
  authenticate,
  requireAdmin,
  updateRoom
);

router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  deleteRoom
);

module.exports = router;