const prisma = require("../config/prisma");

const VALID_STATUSES = [
  "AVAILABLE",
  "BOOKED",
  "MAINTENANCE",
];

const validateRoomStatus = (status) => {
  return VALID_STATUSES.includes(status);
};

// Create Room
const createRoom = async (req, res) => {
  try {
    const hotelId = Number(req.params.hotelId);
    if (!Number.isInteger(hotelId) || hotelId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }
    const {
      roomNumber,
      roomType,
      price,
      capacity,
      status,
    } = req.body;
    if (!roomNumber || !roomType) {
      return res.status(400).json({
        success: false,
        message: "Room number and room type are required",
      });
    }
    const numericPrice = Number(price);
    const numericCapacity = Number(capacity);
    if (price === undefined ||Number.isNaN(numericPrice) ||numericPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be greater than 0",
      });
    }
   if (capacity === undefined ||Number.isNaN(numericCapacity) |!Number.isInteger(numericCapacity) ||numericCapacity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Capacity must be a positive integer",
      });
    }
    if (status !== undefined && !validateRoomStatus(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }
    const hotel = await prisma.hotel.findUnique({
      where: {
        id: hotelId,
      },
    });
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }
    const normalizedRoomNumber = String(roomNumber).trim();
    const existingRoom = await prisma.room.findFirst({
      where: {
        hotelId,
        roomNumber: normalizedRoomNumber,
      },
    });
    if (existingRoom) {
      return res.status(409).json({
        success: false,
        message: "Room number already exists in this hotel",
      });
    }
    const room = await prisma.room.create({
      data: {
        hotelId,
        roomNumber: normalizedRoomNumber,
        roomType: String(roomType).trim(),
        price: numericPrice,
        capacity: numericCapacity,
        status: status || "AVAILABLE",
      },
    });
    return res.status(201).json({
      success: true,
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    console.error("Create room error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create room",
    });
  }
};

// Get all rooms of a hotel
const getRoomsByHotel = async (req, res) => {
  try {
    const hotelId = Number(req.params.hotelId);
    if (!Number.isInteger(hotelId) || hotelId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }
    const hotel = await prisma.hotel.findUnique({
      where: {
        id: hotelId,
      },
      select: {
        id: true,
        name: true,
        city: true,
        address: true,
      },
    });
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }
    const rooms = await prisma.room.findMany({
      where: {
        hotelId,
      },
      orderBy: {
        roomNumber: "asc",
      },
    });
    return res.status(200).json({
      success: true,
      hotel,
      count: rooms.length,
      rooms,
    });
  } catch (error) {
    console.error("Get rooms error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get rooms",
    });
  }
};

// Get single room
const getRoomById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID",
      });
    }

    const room = await prisma.room.findUnique({
      where: {
        id,
      },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
          },
        },
      },
    });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }
    return res.status(200).json({
      success: true,
      room,
    });
  } catch (error) {
    console.error("Get room error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get room",
    });
  }
};

// Update Room
const updateRoom = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID",
      });
    }
    const existingRoom = await prisma.room.findUnique({
      where: { id,},
    });
    if (!existingRoom) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }
    const {
      roomNumber,
      roomType,
      price,
      capacity,
      status,
    } = req.body;
    const data = {};
    if (roomNumber !== undefined) {
      const normalizedRoomNumber = String(roomNumber).trim();
      if (!normalizedRoomNumber) {
        return res.status(400).json({
          success: false,
          message: "Room number cannot be empty",
        });
      }
      const duplicateRoom = await prisma.room.findFirst({
        where: {
          hotelId: existingRoom.hotelId,
          roomNumber: normalizedRoomNumber,
          NOT: { id, },
        },
      });
      if (duplicateRoom) {
        return res.status(409).json({
          success: false,
          message: "Room number already exists in this hotel",
        });
      }
      data.roomNumber = normalizedRoomNumber;
    }
    if (roomType !== undefined) {
      const normalizedRoomType = String(roomType).trim();
      if (!normalizedRoomType) {
        return res.status(400).json({
          success: false,
          message: "Room type cannot be empty",
        });
      }
      data.roomType = normalizedRoomType;
    }

    if (price !== undefined) {
      const numericPrice = Number(price);
      if ( Number.isNaN(numericPrice) || numericPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: "Price must be greater than 0",
        });
      }
      data.price = numericPrice;
    }
    if (capacity !== undefined) {
      const numericCapacity = Number(capacity);
      if ( Number.isNaN(numericCapacity) || !Number.isInteger(numericCapacity) || numericCapacity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Capacity must be a positive integer",
        });
      }
      data.capacity = numericCapacity;
    }
    if (status !== undefined) {
      if (!validateRoomStatus(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${VALID_STATUSES.join(", ")}`,
        });
      }
      data.status = status;
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }
    const room = await prisma.room.update({
      where: {id,},
      data,
    });
    return res.status(200).json({
      success: true,
      message: "Room updated successfully",
      room,
    });
  } catch (error) {
    console.error("Update room error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update room",
    });
  }
};

// Delete Room
const deleteRoom = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID",
      });
    }
    const existingRoom = await prisma.room.findUnique({
      where: { id,},
    });
    if (!existingRoom) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }
    await prisma.room.delete({
      where: {id,},
    });
    return res.status(200).json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error) {
    console.error("Delete room error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete room",
    });
  }
};

module.exports = {
  createRoom,
  getRoomsByHotel,
  getRoomById,
  updateRoom,
  deleteRoom,
};