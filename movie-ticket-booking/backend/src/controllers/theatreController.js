
const prisma = require("../config/prisma");

// Create theatre - ADMIN
async function createTheatre(req, res) {
  try {
    const {
      name,
      city,
      address,
    } = req.body;

    if (!name || !city || !address) {
      return res.status(400).json({
        message: "Name, city and address are required",
      });
    }
    const theatre = await prisma.theatre.create({
      data: {
        name,
        city,
        address,
      },
    });
    res.status(201).json({
      message: "Theatre created successfully",
      theatre,
    });
  } catch (error) {
    console.error("Create theatre error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}


// Get all theatres - PUBLIC
async function getTheatres(req, res) {
  try {
    const { city, search } = req.query;
    const where = {};
    if (city) {
      where.city = city;
    }
    if (search) {
      where.name = {
        contains: search,
      };
    }
    const theatres = await prisma.theatre.findMany({
      where,
      include: {
        screens: {
          select: {
            id: true,
            name: true,
            capacity: true,
            theatreId: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
    res.json({
      count: theatres.length,
      theatres,
    });
  } catch (error) {
    console.error("Get theatres error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}


// Get theatre by ID - PUBLIC
async function getTheatreById(req, res) {
  try {
    const theatreId = Number(req.params.id);
    if (!Number.isInteger(theatreId)) {
      return res.status(400).json({
        message: "Invalid theatre ID",
      });
    }
    const theatre = await prisma.theatre.findUnique({
      where: {
        id: theatreId,
      },
      include: {
        screens: {
          select: {
            id: true,
            name: true,
            capacity: true,
            theatreId: true,
          },
        },
      },
    });
    if (!theatre) {
      return res.status(404).json({
        message: "Theatre not found",
      });
    }
    res.json({
      theatre,
    });
  } catch (error) {
    console.error("Get theatre error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}


// Update theatre - ADMIN
async function updateTheatre(req, res) {
  try {
    const theatreId = Number(req.params.id);
    if (!Number.isInteger(theatreId)) {
      return res.status(400).json({
        message: "Invalid theatre ID",
      });
    }
    const existingTheatre = await prisma.theatre.findUnique({
      where: {
        id: theatreId,
      },
    });
    if (!existingTheatre) {
      return res.status(404).json({
        message: "Theatre not found",
      });
    }
    const {
      name,
      city,
      address,
    } = req.body;
    const theatre = await prisma.theatre.update({
      where: {
        id: theatreId,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(city !== undefined && { city }),
        ...(address !== undefined && { address }),
      },
    });
    res.json({
      message: "Theatre updated successfully",
      theatre,
    });
  } catch (error) {
    console.error("Update theatre error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}


// Delete theatre - ADMIN
async function deleteTheatre(req, res) {
  try {
    const theatreId = Number(req.params.id);
    if (!Number.isInteger(theatreId)) {
      return res.status(400).json({
        message: "Invalid theatre ID",
      });
    }
    const existingTheatre = await prisma.theatre.findUnique({
      where: {
        id: theatreId,
      },
    });
    if (!existingTheatre) {
      return res.status(404).json({
        message: "Theatre not found",
      });
    }
    await prisma.theatre.delete({
      where: {
        id: theatreId,
      },
    });
    res.json({
      message: "Theatre deleted successfully",
    });
  } catch (error) {
    console.error("Delete theatre error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}


module.exports = {
  createTheatre,
  getTheatres,
  getTheatreById,
  updateTheatre,
  deleteTheatre,
};