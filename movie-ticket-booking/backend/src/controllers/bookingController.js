const bookingService = require("../services/bookingService");

async function createBooking(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }
    const booking = await bookingService.createBooking({
      userId: req.user.id,
      showId: req.body.showId,
      showSeatIds: req.body.showSeatIds,
    });
    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    console.error("Create booking error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create booking",
    });
  }
}

async function getMyBookings(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }
    const bookings = await bookingService.getMyBookings(
      req.user.id
    );
    return res.status(200).json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error("Get bookings error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get bookings",
    });
  }
}

async function getBookingById(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }
    const booking = await bookingService.getBookingById({
      bookingId: req.params.id,
      userId: req.user.id,
    });
    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Get booking error:", error);
    return res.status(404).json({
      success: false,
      message: error.message || "Booking not found",
    });
  }
}

async function cancelBooking(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }
    const booking = await bookingService.cancelBooking({
      bookingId: req.params.id,
      userId: req.user.id,
    });
    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to cancel booking",
    });
  }
}

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
};