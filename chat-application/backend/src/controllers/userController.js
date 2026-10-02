const prisma = require("../prisma");

// ========================================
// GET ALL USERS
// GET /api/users
// ========================================
async function getUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      where: {
        id: {
          not: req.user.id,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
        status: true,
        lastSeen: true,
        createdAt: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get users",
    });
  }
}

// ========================================
// SEARCH USERS
// GET /api/users/search?q=yeshu
// ========================================
async function searchUsers(req, res) {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const search = q.trim();

    const users = await prisma.user.findMany({
      where: {
        id: {
          not: req.user.id,
        },
        OR: [
          {
            name: {
              contains: search,
            },
          },
          {
            email: {
              contains: search,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
        status: true,
        lastSeen: true,
      },
      orderBy: {
        name: "asc",
      },
      take: 20,
    });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Search users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to search users",
    });
  }
}

// ========================================
// GET USER BY ID
// GET /api/users/:id
// ========================================
async function getUserById(req, res) {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
        status: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get user",
    });
  }
}

// ========================================
// UPDATE OWN PROFILE
// PUT /api/users/profile
// ========================================
async function updateProfile(req, res) {
  try {
    const { name, profileImage } = req.body;

    const data = {};

    // Validate and update name
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Name must contain at least 2 characters",
        });
      }

      data.name = name.trim();
    }

    // Update profile image
    if (profileImage !== undefined) {
      if (
        profileImage !== null &&
        typeof profileImage !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: "Profile image must be a URL or null",
        });
      }

      if (
        typeof profileImage === "string" &&
        profileImage.length > 2000
      ) {
        return res.status(400).json({
          success: false,
          message: "Profile image URL is too long",
        });
      }

      data.profileImage = profileImage;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No profile fields provided",
      });
    }

    const user = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
        status: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
}

module.exports = {
  getUsers,
  searchUsers,
  getUserById,
  updateProfile,
};