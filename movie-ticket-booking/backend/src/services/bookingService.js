
const prisma = require("../config/prisma");

async function createBooking({ userId, showId, showSeatIds }) {
  if (!userId) {
    throw new Error("User authentication required");
  }
  const numericShowId = Number(showId);
  if (!Number.isInteger(numericShowId) || numericShowId <= 0) {
    throw new Error("Invalid showId");
  }
  if (!Array.isArray(showSeatIds) || showSeatIds.length === 0) {
    throw new Error("At least one seat must be selected");
  }
  // Convert IDs to numbers and remove duplicates.
  const uniqueSeatIds = [
    ...new Set(
      showSeatIds.map((id) => Number(id))
    ),
  ];
  // Validate every selected seat ID.
  if ( uniqueSeatIds.some( (id) => !Number.isInteger(id) || id <= 0 )) {
    throw new Error("Invalid showSeatIds");
  }

  return prisma.$transaction(async (tx) => {
    // 1. Check show
    const show = await tx.show.findUnique({
      where: { id: numericShowId,},
      select: {
        id: true,
        isActive: true,
      },
    });
    if (!show) {
      throw new Error("Show not found");
    }
    if (!show.isActive) {
      throw new Error("This show is not active");
    }
    // 2. Get ONLY selected ShowSeat records
    const showSeats = await tx.showSeat.findMany({
      where: {
        id: { in: uniqueSeatIds, },
        showId: numericShowId,
      },
      select: {
        id: true,
        showId: true,
        status: true,
        price: true,
        seatId: true,
      },
    });

    // Every requested ID must exist for this show.
    if (showSeats.length !== uniqueSeatIds.length) {
      const foundIds = new Set(
        showSeats.map((seat) => seat.id)
      );

      const missingIds = uniqueSeatIds.filter(
        (id) => !foundIds.has(id)
      );
      throw new Error(`Selected seat(s) not found for this show: ${missingIds.join(", ")}`);
    }
    // 3. Check ONLY selected seats
    const unavailableSeats = showSeats.filter(
      (seat) => seat.status !== "AVAILABLE"
    );

    if (unavailableSeats.length > 0) {
      throw new Error(
        `Seat(s) ${unavailableSeats
          .map((seat) => seat.id)
          .join(", ")} are already booked`
      );
    }
    // 4. Book ONLY selected seats
    const reserveResult = await tx.showSeat.updateMany({
      where: {
        id: { in: uniqueSeatIds,},
        showId: numericShowId,
        status: "AVAILABLE",
      },
      data: {
        status: "BOOKED",
      },
    });

    if (reserveResult.count !== uniqueSeatIds.length) {
      throw new Error("One or more selected seats were booked by another user. Please select the seats again." );
    }

    // 5. Calculate price ONLY for selected seats
    const totalAmount = showSeats.reduce(
      (total, seat) =>
        total + Number(seat.price || 0), 0
    );

    // 6. Create booking
    const bookingNumber =
      `BK-${Date.now()}-${Math.floor(
        Math.random() * 1000
      )}`;
    const booking = await tx.booking.create({
      data: {
        userId: Number(userId),
        showId: numericShowId,
        bookingNumber,
        totalAmount,
        bookingStatus: "CONFIRMED",
        paymentStatus: "PAID",
      },
    });

    // 7. Create booking seats
    // ONLY selected ShowSeat records
    await tx.bookingSeat.createMany({
      data: showSeats.map((seat) => ({
        bookingId: booking.id,
        showSeatId: seat.id,
        seatPrice: seat.price,
      })),
    });

    // 8. Return booking
    return tx.booking.findUnique({
      where: {
        id: booking.id,
      },
      include: {
        bookingSeats: {
          include: {
            showSeat: {
              include: {
                seat: true,
              },
            },
          },
        },
        show: {
          include: {
            movie: true,
            theatre: true,
            screen: true,
          },
        },
      },
    });
  });
}

async function getBookingById({ bookingId, userId,}) {
  if (!userId) {
    throw new Error("User authentication required");
  }

  const booking = await prisma.booking.findFirst({
    where: {
      id: Number(bookingId),
      userId: Number(userId),
    },
    include: {
      bookingSeats: {
        include: {
          showSeat: {
            include: {
              seat: true,
            },
          },
        },
      },
      show: {
        include: {
          movie: true,
          theatre: true,
          screen: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }
  return booking;
}

async function getMyBookings(userId) {
  if (!userId) {
    throw new Error("User authentication required");
  }

  return prisma.booking.findMany({
    where: { userId: Number(userId), },
    orderBy: { createdAt: "desc",},
    include: {
      bookingSeats: {
        include: {
          showSeat: {
            include: {
              seat: true,
            },
          },
        },
      },
      show: {
        include: {
          movie: true,
          theatre: true,
          screen: true,
        },
      },
    },
  });
}

async function cancelBooking({bookingId,userId,}) {
  if (!userId) {
    throw new Error("User authentication required");
  }
  if (!bookingId) {
    throw new Error("Booking ID is required");
  }
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: {
        id: Number(bookingId),
        userId: Number(userId),
      },
      include: {
        bookingSeats: {
          select: {
            showSeatId: true,
          },
        },
      },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }
    if (booking.status === "CANCELLED") {
      throw new Error("Booking is already cancelled");
    }
    if (booking.status !== "CONFIRMED") {
      throw new Error( `Booking cannot be cancelled because its status is ${booking.status}` );
    }
    const updatedBooking = await tx.booking.update({
      where: { id: booking.id, },
      data: { status: "CANCELLED",},
    });

    // Release ONLY seats belonging to this booking.
    const showSeatIds =
      booking.bookingSeats.map(
        (bookingSeat) => bookingSeat.showSeatId
      );
    if (showSeatIds.length > 0) {
      await tx.showSeat.updateMany({
        where: {
          id: {
            in: showSeatIds,
          },
          status: "BOOKED",
        },
        data: {
          status: "AVAILABLE",
        },
      });
    }

    return tx.booking.findUnique({
      where: {
        id: updatedBooking.id,
      },
      include: {
        bookingSeats: {
          include: {
            showSeat: {
              include: {
                seat: true,
              },
            },
          },
        },
        show: {
          include: {
            movie: true,
            theatre: true,
            screen: true,
          },
        },
      },
    });
  });
}

module.exports = {
  createBooking,
  getBookingById,
  getMyBookings,
  cancelBooking,
};