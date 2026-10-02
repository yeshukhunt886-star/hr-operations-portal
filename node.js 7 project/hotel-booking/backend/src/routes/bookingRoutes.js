const express = require("express");

const {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
} = require("../controllers/bookingController");

const {
  authenticate,
  requireAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Admin
// Get all bookings
router.get(
  "/",
  authenticate,
  requireAdmin,
  getAllBookings
);


// User
// Create booking
router.post(
  "/",
  authenticate,
  createBooking
);

// Get logged-in user's bookings
router.get(
  "/my",
  authenticate,
  getMyBookings
);

// Get booking by ID
router.get(
  "/:id",
  authenticate,
  getBookingById
);

// Cancel booking
router.patch(
  "/:id/cancel",
  authenticate,
  cancelBooking
);

module.exports = router;