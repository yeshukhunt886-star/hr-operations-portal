const prisma = require("../config/prisma");

// Create screen - ADMIN
async function createScreen(req, res) {
  try {
    const theatreId = Number(req.params.theatreId);
    if (!Number.isInteger(theatreId)) {
      return res.status(400).json({
        message: "Invalid theatre ID",
      });
    }
    const {name,capacity,} = req.body;
    if (!name || !capacity) {
      return res.status(400).json({
        message: "Name and capacity are required",
      });
    }
    const theatre = await prisma.theatre.findUnique({
      where: {
        id: theatreId,
      },
    });
    if (!theatre) {
      return res.status(404).json({
        message: "Theatre not found",
      });
    }
    const screen = await prisma.screen.create({
      data: {
        name,
        capacity: Number(capacity),
        theatreId,
      },
    });
    res.status(201).json({
      message: "Screen created successfully",
      screen,
    });
  } catch (error) {
    console.error("Create screen error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

// Get screens for theatre - PUBLIC
async function getScreens(req, res) {
  try {
    const theatreId = Number(req.params.theatreId);
    if (!Number.isInteger(theatreId)) {
      return res.status(400).json({
        message: "Invalid theatre ID",
      });
    }
    const screens = await prisma.screen.findMany({
      where: {
        theatreId,
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    res.json({
      count: screens.length,
      screens,
    });
  } catch (error) {
    console.error("Get screens error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

// Update screen - ADMIN
async function updateScreen(req, res) {
  try {
    const screenId = Number(req.params.id);
    if (!Number.isInteger(screenId)) {
      return res.status(400).json({
        message: "Invalid screen ID",
      });
    }
    const existingScreen = await prisma.screen.findUnique({
      where: {
        id: screenId,
      },
    });
    if (!existingScreen) {
      return res.status(404).json({
        message: "Screen not found",
      });
    }
    const {
      name,
      capacity,
      isActive,
    } = req.body;
    const screen = await prisma.screen.update({
      where: {
        id: screenId,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(capacity !== undefined && {
          capacity: Number(capacity),
        }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json({
      message: "Screen updated successfully",
      screen,
    });
  } catch (error) {
    console.error("Update screen error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

// Delete screen - ADMIN
async function deleteScreen(req, res) {
  try {
    const screenId = Number(req.params.id);
    if (!Number.isInteger(screenId)) {
      return res.status(400).json({
        message: "Invalid screen ID",
      });
    }
    const existingScreen = await prisma.screen.findUnique({
      where: {
        id: screenId,
      },
    });
    if (!existingScreen) {
      return res.status(404).json({
        message: "Screen not found",
      });
    }
    await prisma.screen.delete({
      where: {
        id: screenId,
      },
    });
    res.json({
      message: "Screen deleted successfully",
    });
  } catch (error) {
    console.error("Delete screen error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

module.exports = {
  createScreen,
  getScreens,
  updateScreen,
  deleteScreen,
};