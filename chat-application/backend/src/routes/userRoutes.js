const express = require("express");

const {
  getUsers,
  searchUsers,
  getUserById,
  updateProfile,
} = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// All user routes require JWT
router.use(authMiddleware);

// Get all users
router.get("/", getUsers);

// Search users
router.get("/search", searchUsers);

// Update logged-in user's profile
router.put("/profile", updateProfile);

// Get specific user
router.get("/:id", getUserById);

module.exports = router;