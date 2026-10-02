const prisma = require("../config/prisma");

// Create physical seats for a screen
const createSeats = async (req, res) => {
  try {
    const screenId = Number(req.params.screenId);
    if (!Number.isInteger(screenId) || screenId <= 0) {
      return res.status(400).json({
        message: "Valid screenId is required",
      });
    }
    const screen = await prisma.screen.findUnique({
      where: {id: screenId,},
    });
    if (!screen) {
      return res.status(404).json({
        message: "Screen not found",
      });
    }
    const existingSeats = await prisma.seat.count({
      where: {screenId,},
    });
    if (existingSeats > 0) {
      return res.status(409).json({
        message: "Seats already exist for this screen",
        totalSeats: existingSeats,
      });
    }
    const seatsPerRow = 10;
    const rows = Math.ceil(screen.capacity / seatsPerRow);
    const seats = [];
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const rowName = String.fromCharCode(65 + rowIndex);
      const remainingSeats =
        screen.capacity - rowIndex * seatsPerRow;
      const seatsInThisRow = Math.min(seatsPerRow,remainingSeats );
      for (let number = 1; number <= seatsInThisRow; number++) {
        seats.push({
          screenId,
          row: rowName,
          number,
          seatLabel: `${rowName}${number}`,
          seatType: "REGULAR",
          isActive: true,
        });
      }
    }
    await prisma.seat.createMany({
      data: seats,
    });
    return res.status(201).json({
      message: "Seats created successfully",
      screenId,
      totalSeats: seats.length,
      seats,
    });
  } catch (error) {
    console.error("Create seats error:", error);
    return res.status(500).json({
      message: "Failed to create seats",
      error: error.message,
    });
  }
};

// Get all physical seats for a screen
const getSeatsByScreen = async (req, res) => {
  try {
    const screenId = Number(req.params.screenId);
    if (!Number.isInteger(screenId) || screenId <= 0) {
      return res.status(400).json({
        message: "Valid screenId is required",
      });
    }
    const seats = await prisma.seat.findMany({
      where: {
        screenId,
        isActive: true,
      },
      orderBy: [
        {row: "asc",},
        {number: "asc",},
      ],
    });
    return res.json({
      screenId,
      totalSeats: seats.length,
      seats,
    });
  } catch (error) {
    console.error("Get screen seats error:", error);
    return res.status(500).json({
      message: "Failed to get seats",
      error: error.message,
    });
  }
};


// Create ShowSeat records for a show
const createShowSeats = async (req, res) => {
  try {
    const showId = Number(req.params.showId);
    if (!Number.isInteger(showId) || showId <= 0) {
      return res.status(400).json({
        message: "Valid showId is required",
      });
    }
    const show = await prisma.show.findUnique({
      where: {id: showId,},
      include: {screen: true,},
    });
    if (!show) {
      return res.status(404).json({
        message: "Show not found",
      });
    }
    const existingShowSeats = await prisma.showSeat.count({
      where: {showId,},
    });
    if (existingShowSeats > 0) {
      return res.status(409).json({
        message: "Show seats already exist",
        showId,
        totalShowSeats: existingShowSeats,
      });
    }
    const seats = await prisma.seat.findMany({
      where: {
        screenId: show.screenId,
        isActive: true,
      },
      orderBy: [
        {row: "asc",},
        {number: "asc", },
      ],
    });
    if (seats.length === 0) {
      return res.status(404).json({
        message:"No physical seats found for this screen. Create screen seats first.",
      });
    }
    const showSeats = seats.map((seat) => ({
      showId: show.id,
      seatId: seat.id,
      status: "AVAILABLE",
      price: show.ticketPrice,
    }));
    await prisma.showSeat.createMany({
      data: showSeats,
    });
    return res.status(201).json({
      message: "Show seats created successfully",
      showId,
      totalShowSeats: showSeats.length,
      showSeats,
    });
  } catch (error) {
    console.error("Create show seats error:", error);
    return res.status(500).json({
      message: "Failed to create show seats",
      error: error.message,
    });
  }
};

// Get seats for a selected show
const getSeatsByShow = async (req, res) => {
  try {
    const showId = Number(req.params.showId);
    if (!Number.isInteger(showId) || showId <= 0) {
      return res.status(400).json({
        message: "Valid showId is required",
      });
    }
      const show = await prisma.show.findUnique({
      where: {id: showId,},
      include: {
        movie: {
          select: {
            id: true,
            title: true,
          },
        },
        theatre: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        screen: {
          select: {
            id: true,
            name: true,
            capacity: true,
          },
        },
      },
    });
    if (!show) {
      return res.status(404).json({
        message: "Show not found",
      });
    }
    const showSeats = await prisma.showSeat.findMany({
      where: {
        showId,
        seat: {isActive: true,},
      },
      include: {seat: true,},
      orderBy: {id: "asc",},
    });
    const availableSeats = showSeats.filter(
      (seat) => seat.status === "AVAILABLE"
    );
    const bookedSeats = showSeats.filter(
      (seat) => seat.status === "BOOKED"
    );
    return res.json({
      show: {
        id: show.id,
        movie: show.movie,
        theatre: show.theatre,
        screen: show.screen,
        showDate: show.showDate,
        startTime: show.startTime,
        ticketPrice: show.ticketPrice,
      },
      totalSeats: showSeats.length,
      availableSeats: availableSeats.length,
      bookedSeats: bookedSeats.length,
      seats: showSeats.map((showSeat) => ({
        showSeatId: showSeat.id,
        seatId: showSeat.seat.id,
        row: showSeat.seat.row,
        number: showSeat.seat.number,
        seatLabel: showSeat.seat.seatLabel,
        seatType: showSeat.seat.seatType,
        status: showSeat.status,
        price: showSeat.price,
      })),
    });
  } catch (error) {
    console.error("Get show seats error:", error);
    return res.status(500).json({
      message: "Failed to get show seats",
      error: error.message,
    });
  }
};


module.exports = {
  createSeats,
  getSeatsByScreen,
  createShowSeats,
  getSeatsByShow,
};