const prisma = require("../config/prisma");

const validateRating = (rating) => {
  if (rating === undefined || rating === null) {
    return null;
  }
  const value = Number(rating);
  if (Number.isNaN(value) ||value < 0 ||value > 5) {
    return "Rating must be between 0 and 5";
  }
  return null;
};

const createHotel = async (req, res) => {
  try {
    const {
      name,
      city,
      address,
      description,
      image,
      rating,
    } = req.body;
   if (!name || !city || !address) {
      return res.status(400).json({
        success: false,
        message: "Name, city and address are required",
      });
    }
    const ratingError = validateRating(rating);
    if (ratingError) {
      return res.status(400).json({
        success: false,
        message: ratingError,
      });
    }
    const hotel = await prisma.hotel.create({
      data: {
        name: name.trim(),
        city: city.trim(),
        address: address.trim(),
        description:
          description !== undefined && description !== null
            ? String(description).trim()
            : null,
        image:
          image !== undefined && image !== null
            ? String(image).trim()
            : null,
        rating:
          rating !== undefined && rating !== null
            ? Number(rating)
            : null,
      },
    });
    return res.status(201).json({
      success: true,
      message: "Hotel created successfully",
      hotel,
    });
  } catch (error) {
    console.error("Create hotel error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create hotel",
    });
  }
};

const getHotels = async (req, res) => {
  try {
    const { city } = req.query;
    const where = {};
    if (city) {
      where.city = {
        contains: String(city).trim(),
      };
    }
    const hotels = await prisma.hotel.findMany({
      where,
      orderBy: {createdAt: "desc",},
      include: {
        _count: {
          select: {rooms: true,},
        },
      },
    });
    return res.status(200).json({
      success: true,
      count: hotels.length,
      hotels,
    });
  } catch (error) {
    console.error("Get hotels error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get hotels",
    });
  }
};

const getHotelById = async (req, res) => {
  try {
    const hotelId = Number(req.params.id);
    if (!Number.isInteger(hotelId) || hotelId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }
    const hotel = await prisma.hotel.findUnique({
      where: {id: hotelId,},
      include: {
        rooms: {
          orderBy: {roomNumber: "asc",},
        },
        _count: {
          select: {rooms: true,},
        },
      },
    });
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }
    return res.status(200).json({
      success: true,
      hotel,
    });
  } catch (error) {
    console.error("Get hotel error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get hotel",
    });
  }
};

const updateHotel = async (req, res) => {
  try {
    const hotelId = Number(req.params.id);
    if (!Number.isInteger(hotelId) || hotelId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }
    const existingHotel = await prisma.hotel.findUnique({
      where: {id: hotelId,},
    });
    if (!existingHotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }
    const {
      name,
      city,
      address,
      description,
      image,
      rating,
    } = req.body;
    const data = {};
    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: "Hotel name cannot be empty",
        });
      }
      data.name = String(name).trim();
    }
    if (city !== undefined) {
      if (!String(city).trim()) {
        return res.status(400).json({
          success: false,
          message: "City cannot be empty",
        });
      }
      data.city = String(city).trim();
    }
    if (address !== undefined) {
      if (!String(address).trim()) {
        return res.status(400).json({
          success: false,
          message: "Address cannot be empty",
        });
      }
      data.address = String(address).trim();
    }
    if (description !== undefined) {
      data.description =
        description === null
          ? null
          : String(description).trim();
    }
    if (image !== undefined) {
      data.image =
        image === null
          ? null
          : String(image).trim();
    }
    if (rating !== undefined) {
      const ratingError = validateRating(rating);
      if (ratingError) {
        return res.status(400).json({
          success: false,
          message: ratingError,
        });
      }
      data.rating = rating === null ? null : Number(rating);
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }
    const hotel = await prisma.hotel.update({
      where: {id: hotelId,},
      data,
    });
    return res.status(200).json({
      success: true,
      message: "Hotel updated successfully",
      hotel,
    });
  } catch (error) {
    console.error("Update hotel error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update hotel",
    });
  }
};

const deleteHotel = async (req, res) => {
  try {
    const hotelId = Number(req.params.id);
    if (!Number.isInteger(hotelId) || hotelId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID",
      });
    }
    const hotel = await prisma.hotel.findUnique({
      where: {id: hotelId,},
    });
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }
    await prisma.hotel.delete({
      where: {id: hotelId,},
    });
    return res.status(200).json({
      success: true,
      message: "Hotel deleted successfully",
    });
  } catch (error) {
    console.error("Delete hotel error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete hotel",
    });
  }
};

module.exports = {
  createHotel,
  getHotels,
  getHotelById,
  updateHotel,
  deleteHotel,
};