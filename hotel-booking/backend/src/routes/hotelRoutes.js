const express = require("express");

const {
  createHotel,
  getHotels,
  getHotelById,
  updateHotel,
  deleteHotel,
} = require("../controllers/hotelController");

const {
  authenticate,
  requireAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.get("/", getHotels);
router.get("/:id", getHotelById);

// Admin routes
router.post(
  "/",
  authenticate,
  requireAdmin,
  createHotel
);

router.put(
  "/:id",
  authenticate,
  requireAdmin,
  updateHotel
);

router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  deleteHotel
);

module.exports = router;