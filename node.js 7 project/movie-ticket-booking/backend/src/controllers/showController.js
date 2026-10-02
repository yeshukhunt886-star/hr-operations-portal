const prisma = require("../config/prisma");

async function createShow(req, res) {
  try {
    const {
      movieId,
      theatreId,
      screenId,
      showDate,
      startTime,
      ticketPrice,
    } = req.body;
    // Validate required fields
    if (
      !movieId ||
      !theatreId ||
      !screenId ||
      !showDate ||
      !startTime ||
      ticketPrice === undefined
    ) {
      return res.status(400).json({
        message:"movieId, theatreId, screenId, showDate, startTime and ticketPrice are required",
      });
    }
    const parsedMovieId = Number(movieId);
    const parsedTheatreId = Number(theatreId);
    const parsedScreenId = Number(screenId);
    const parsedPrice = Number(ticketPrice);
    if (!Number.isInteger(parsedMovieId) ||parsedMovieId <= 0) {
      return res.status(400).json({
        message: "Invalid movieId",
      });
    }
    if (!Number.isInteger(parsedTheatreId) ||parsedTheatreId <= 0) {
      return res.status(400).json({
        message: "Invalid theatreId",
      });
    }
    if (!Number.isInteger(parsedScreenId) ||parsedScreenId <= 0) {
      return res.status(400).json({
        message: "Invalid screenId",
      });
    }
    if (!Number.isFinite(parsedPrice) ||parsedPrice <= 0) {
      return res.status(400).json({
        message: "Ticket price must be greater than 0",
      });
    }
    // Check active movie
    const movie = await prisma.movie.findFirst({
      where: {
        id: parsedMovieId,
        status: "ACTIVE",
      },
    });
    if (!movie) {
      return res.status(404).json({
        message: "Active movie not found",
      });
    }
    // Check theatre
    const theatre = await prisma.theatre.findUnique({
      where: {
        id: parsedTheatreId,
      },
    });
    if (!theatre) {
      return res.status(404).json({
        message: "Theatre not found",
      });
    }
    // Check screen belongs to theatre
    const screen = await prisma.screen.findFirst({
      where: {
        id: parsedScreenId,
        theatreId: parsedTheatreId,
        isActive: true,
      },
    });
    if (!screen) {
      return res.status(404).json({
        message:"Screen not found, inactive, or screen does not belong to this theatre",
      });
    }
    // Validate date/time
    const showDateValue = new Date(
      `${showDate}T00:00:00`
    );
    const startTimeValue = new Date(
      `${showDate}T${startTime}:00`
    );
    if (Number.isNaN(showDateValue.getTime()) ||Number.isNaN(startTimeValue.getTime())) {
      return res.status(400).json({
        message: "Invalid showDate or startTime",
      });
    }
    // Prevent duplicate show
    const existingShow = await prisma.show.findFirst({
      where: {
        screenId: parsedScreenId,
        startTime: startTimeValue,
      },
    });
    if (existingShow) {
      return res.status(409).json({
        message:"A show already exists on this screen at this time",
      });
    }
    const physicalSeats = await prisma.seat.findMany({
      where: {
        screenId: parsedScreenId,
        isActive: true,
      },
      orderBy: [
        {row: "asc",},
        {number: "asc",},
      ],
    });
    if (physicalSeats.length === 0) {
      return res.status(400).json({
        message:"No physical seats found for this screen. Please create seats for the screen first.",
      });
    }
    const result = await prisma.$transaction(
      async (tx) => {
        // Create show
        const show = await tx.show.create({
          data: {
            movieId: parsedMovieId,
            theatreId: parsedTheatreId,
            screenId: parsedScreenId,
            showDate: showDateValue,
            startTime: startTimeValue,
            ticketPrice: parsedPrice,
          },
        });
        // Automatically create ShowSeat records
        const showSeats = physicalSeats.map(
          (seat) => ({
            showId: show.id,
            seatId: seat.id,
            status: "AVAILABLE",
            price: parsedPrice,
          })
        );
        await tx.showSeat.createMany({
          data: showSeats,
        });

        // Get complete show
        const completeShow =
          await tx.show.findUnique({
            where: {id: show.id,},
            include: {
              movie: {
                select: {
                  id: true,
                  title: true,
                  genre: true,
                  language: true,
                  duration: true,
                  posterUrl: true,
                  status: true,
                },
              },
              theatre: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                  address: true,
                },
              },
              screen: {
                select: {
                  id: true,
                  name: true,
                  capacity: true,
                  theatreId: true,
                },
              },
              showSeats: {
                include: {
                  seat: {
                    select: {
                      id: true,
                      row: true,
                      number: true,
                      seatLabel: true,
                      seatType: true,
                    },
                  },
                },
                orderBy: {
                  id: "asc",
                },
              },
            },
          });
        return completeShow;
      }
    );

    return res.status(201).json({
      message:"Show created successfully and seats generated automatically",
      show: result,
      totalShowSeats:result.showSeats.length,
    });
  } catch (error) {
    console.error("Create show error:",error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}

async function getShows(req, res) {
  try {
    const {
      movieId,
      theatreId,
      screenId,
      date,
    } = req.query;
    const where = {};
    if (movieId) {
      const parsedMovieId = Number(movieId);
      if (!Number.isInteger(parsedMovieId) ||parsedMovieId <= 0) {
        return res.status(400).json({
          message: "Invalid movieId",
        });
      }
      where.movieId = parsedMovieId;
    }
    if (theatreId) {
      const parsedTheatreId = Number(theatreId);
      if (!Number.isInteger(parsedTheatreId) ||parsedTheatreId <= 0) {
        return res.status(400).json({
          message: "Invalid theatreId",
        });
      }
      where.theatreId = parsedTheatreId;
    }
    if (screenId) {
      const parsedScreenId = Number(screenId);
      if (!Number.isInteger(parsedScreenId) ||parsedScreenId <= 0) {
        return res.status(400).json({
          message: "Invalid screenId",
        });
      }
      where.screenId = parsedScreenId;
    }
    // Filter by date
    if (date) {
      const startOfDay = new Date( `${date}T00:00:00`);
      const endOfDay = new Date(`${date}T23:59:59.999`);
      if (Number.isNaN(startOfDay.getTime()) || Number.isNaN(endOfDay.getTime())) {
        return res.status(400).json({
          message: "Invalid date",
        });
      }
      where.showDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }
    const shows = await prisma.show.findMany({
      where,
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            genre: true,
            language: true,
            duration: true,
            posterUrl: true,
            status: true,
          },
        },
        theatre: {
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
          },
        },
        screen: {
          select: {
            id: true,
            name: true,
            capacity: true,
            theatreId: true,
          },
        },
        // Show seat count
        _count: {
          select: {
            showSeats: true,
            bookings: true,
          },
        },
      },
      orderBy: [
        {showDate: "asc",},
        {startTime: "asc",},
      ],
    });
    return res.json({
      count: shows.length,
      shows,
    });
  } catch (error) {
    console.error("Get shows error:",error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}

async function getShowById(req, res) {
  try {
    const showId = Number(req.params.id);
    if (!Number.isInteger(showId) ||showId <= 0) {
      return res.status(400).json({
        message: "Invalid show ID",
      });
    }
    const show = await prisma.show.findUnique({
      where: {id: showId,},
      include: {
        movie: true,
        theatre: true,
        screen: true,
        showSeats: {
          include: {seat: true,},
          orderBy: {id: "asc",},
        },
      },
    });
    if (!show) {
      return res.status(404).json({
        message: "Show not found",
      });
    }
    return res.json({show,});
  } catch (error) {
    console.error("Get show error:",error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}

async function updateShow(req, res) {
  try {
    const showId = Number(req.params.id);
    if (!Number.isInteger(showId) ||showId <= 0) {
      return res.status(400).json({
        message: "Invalid show ID",
      });
    }
    const existingShow =
      await prisma.show.findUnique({
        where: {
          id: showId,
        },
      });
    if (!existingShow) {
      return res.status(404).json({
        message: "Show not found",
      });
    }
    const {
      movieId,
      theatreId,
      screenId,
      showDate,
      startTime,
      ticketPrice,
    } = req.body;
    const data = {};
    // Movie
    if (movieId !== undefined) {
      const parsedMovieId = Number(movieId);
      if (!Number.isInteger(parsedMovieId) ||parsedMovieId <= 0) {
        return res.status(400).json({
          message: "Invalid movieId",
        });
      }
      const movie =
        await prisma.movie.findFirst({
          where: {
            id: parsedMovieId,
            status: "ACTIVE",
          },
        });
      if (!movie) {
        return res.status(404).json({
          message: "Active movie not found",
        });
      }
      data.movieId = parsedMovieId;
    }

    // Theatre
    if (theatreId !== undefined) {
      const parsedTheatreId =
        Number(theatreId);
      if (!Number.isInteger(parsedTheatreId) ||parsedTheatreId <= 0) {
        return res.status(400).json({
          message: "Invalid theatreId",
        });
      }
      const theatre =
        await prisma.theatre.findUnique({
          where: {
            id: parsedTheatreId,
          },
        });
      if (!theatre) {
        return res.status(404).json({
          message: "Theatre not found",
        });
      }
      data.theatreId = parsedTheatreId;
    }

    // Screen
    if (screenId !== undefined) {
      const parsedScreenId =
        Number(screenId);
      if (!Number.isInteger(parsedScreenId) || parsedScreenId <= 0) {
        return res.status(400).json({
          message: "Invalid screenId",
        });
      }
      data.screenId = parsedScreenId;
    }
    // Show date
    if (showDate !== undefined) {
      const newShowDate = new Date(
        `${showDate}T00:00:00`
      );
      if (Number.isNaN(newShowDate.getTime())) {
        return res.status(400).json({
          message: "Invalid showDate",
        });
      }
      data.showDate = newShowDate;
    }
    // Start time
    if (startTime !== undefined) {
      const dateForTime =
        showDate ||
        existingShow.showDate
          .toISOString()
          .slice(0, 10);
      const newStartTime = new Date(
        `${dateForTime}T${startTime}:00`
      );
      if (Number.isNaN(newStartTime.getTime())) {
        return res.status(400).json({
          message: "Invalid startTime",
        });
      }
      data.startTime = newStartTime;
    }
    // Ticket price
    if (ticketPrice !== undefined) {
      const parsedPrice =
        Number(ticketPrice);
      if (!Number.isFinite(parsedPrice) ||parsedPrice <= 0) {
        return res.status(400).json({
          message:"Ticket price must be greater than 0",
        });
      }
      data.ticketPrice = parsedPrice;
    }
    // Final theatre/screen
    const finalTheatreId =
      data.theatreId ??
      existingShow.theatreId;
    const finalScreenId =
      data.screenId ??
      existingShow.screenId;

    // Validate screen belongs to theatre
    const screen =
      await prisma.screen.findFirst({
        where: {
          id: finalScreenId,
          theatreId: finalTheatreId,
          isActive: true,
        },
      });
    if (!screen) {
      return res.status(400).json({
        message:"Selected screen does not belong to the selected theatre or is inactive",
      });
    }
    // Final start time
    const finalStartTime =
      data.startTime ??
      existingShow.startTime;
    // Prevent duplicate
    const duplicateShow =
      await prisma.show.findFirst({
        where: {
          screenId: finalScreenId,
          startTime: finalStartTime,
          NOT: {id: showId,},
        },
      });
    if (duplicateShow) {
      return res.status(409).json({
        message:"A show already exists on this screen at this time",
      });
    }
    // Update show
    const updatedShow =
      await prisma.show.update({
        where: {id: showId,},
        data,
        include: {
          movie: true,
          theatre: true,
          screen: true,
          showSeats: {
            include: {seat: true,},
            orderBy: {id: "asc",},
          },
        },
      });

    //  * If ticket price changes,
    //  * update only AVAILABLE ShowSeats.
    //  * Already booked seats keep their original
    //  * booking price.
    if (ticketPrice !== undefined) {
      await prisma.showSeat.updateMany({
        where: {
          showId,
          status: "AVAILABLE",
        },
        data: {
          price: Number(ticketPrice),
        },
      });
    }
    return res.json({
      message:"Show updated successfully",
      show: updatedShow,
    });
  } catch (error) {
    console.error("Update show error:",error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}

async function deleteShow(req, res) {
  try {
    const showId = Number(req.params.id);
    if (!Number.isInteger(showId) ||showId <= 0) {
      return res.status(400).json({
        message: "Invalid show ID",
      });
    }
    const existingShow =
      await prisma.show.findUnique({
        where: {id: showId,},
        include: {
          _count: {
            select: {bookings: true,},
          },
        },
      });
    if (!existingShow) {
      return res.status(404).json({
        message: "Show not found",
      });
    }
      // Do not delete a show that already has bookings.
      // This protects booking history.
    if (existingShow._count.bookings > 0) {
      return res.status(409).json({
        message:"This show cannot be deleted because bookings already exist",
      });
    }
    await prisma.show.delete({
      where: {id: showId,},
    });
    return res.json({
      message:"Show and its seats deleted successfully",
    });
  } catch (error) {
    console.error("Delete show error:",error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}

module.exports = {
  createShow,
  getShows,
  getShowById,
  updateShow,
  deleteShow,
};

