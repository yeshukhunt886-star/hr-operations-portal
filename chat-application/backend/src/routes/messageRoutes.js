const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");

const {
  createMessage,
  getMessages,
  updateMessage,
  deleteMessage,
} = require("../controllers/messageController");

const router = express.Router();

// All message APIs require authentication
router.use(authMiddleware);

// Create message
router.post("/", createMessage);

// Get conversation messages
router.get("/:conversationId", getMessages);

// Update own message
router.put("/:id", updateMessage);

// Delete own message
router.delete("/:id", deleteMessage);

module.exports = router;