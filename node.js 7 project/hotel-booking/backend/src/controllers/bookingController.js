const prisma = require("../config/prisma");

const parseDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

// Create Booking
const createBooking = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      roomId,
      checkIn,
      checkOut,
      guests,
    } = req.body;

    const numericRoomId = Number(roomId);
    const numericGuests = Number(guests);

    if (
      !Number.isInteger(numericRoomId) ||
      numericRoomId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID",
      });
    }

    if (
      !Number.isInteger(numericGuests) ||
      numericGuests <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Guests must be a positive integer",
      });
    }

    const startDate = parseDate(checkIn);
    const endDate = parseDate(checkOut);

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid check-in or check-out date",
      });
    }

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: "Check-out must be after check-in",
      });
    }

    const room = await prisma.room.findUnique({
      where: {
        id: numericRoomId,
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    if (room.status !== "AVAILABLE") {
      return res.status(409).json({
        success: false,
        message: "Room is not available for booking",
      });
    }

    if (numericGuests > room.capacity) {
      return res.status(400).json({
        success: false,
        message: `Maximum capacity is ${room.capacity} guests`,
      });
    }

    const overlappingBooking =
      await prisma.booking.findFirst({
        where: {
          roomId: numericRoomId,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
          checkIn: {
            lt: endDate,
          },
          checkOut: {
            gt: startDate,
          },
        },
      });

    if (overlappingBooking) {
      return res.status(409).json({
        success: false,
        message:
          "Room is already booked for the selected dates",
      });
    }

    const numberOfNights = Math.ceil(
      (endDate.getTime() - startDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const totalAmount =
      Number(room.price) *
      numberOfNights;

    const booking = await prisma.booking.create({
      data: {
        userId,
        roomId: numericRoomId,
        checkIn: startDate,
        checkOut: endDate,
        guests: numericGuests,
        totalAmount,
        status: "CONFIRMED",
      },
      include: {
        room: {
          include: {
            hotel: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    console.error("Create booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create booking",
    });
  }
};

// Get logged-in user's bookings
const getMyBookings = async (req, res) => {
  try {
    const userId = req.user.userId;

    const bookings = await prisma.booking.findMany({
      where: {
        userId,
      },
      include: {
        room: {
          include: {
            hotel: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Get my bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get bookings",
    });
  }
};

// Get booking by ID
const getBookingById = async (req, res) => {
  try {
    const bookingId = Number(req.params.id);

    if (
      !Number.isInteger(bookingId) ||
      bookingId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        room: {
          include: {
            hotel: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const isOwner =
      booking.userId === req.user.userId;

    const isAdmin =
      req.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this booking",
      });
    }

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Get booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get booking",
    });
  }
};

// Cancel Booking
const cancelBooking = async (req, res) => {
  try {
    const bookingId = Number(req.params.id);

    if (
      !Number.isInteger(bookingId) ||
      bookingId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const isOwner =
      booking.userId === req.user.userId;

    const isAdmin =
      req.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You cannot cancel this booking",
      });
    }

    if (booking.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Booking is already cancelled",
      });
    }

    if (booking.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Completed booking cannot be cancelled",
      });
    }

    const updatedBooking =
      await prisma.booking.update({
        where: {
          id: bookingId,
        },
        data: {
          status: "CANCELLED",
        },
      });

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Cancel booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
    });
  }
};

// Admin: Get all bookings
const getAllBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        room: {
          include: {
            hotel: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Get all bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get bookings",
    });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
};