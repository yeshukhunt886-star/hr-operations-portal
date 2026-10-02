const express = require("express");

const {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
} = require("../controllers/bookingController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Create booking
router.post("/", authMiddleware, createBooking);

// Get logged-in user's bookings
router.get("/my", authMiddleware, getMyBookings);

// Cancel booking
router.post("/:id/cancel", authMiddleware, cancelBooking);

// Get one booking
router.get("/:id", authMiddleware, getBookingById);

module.exports = router;