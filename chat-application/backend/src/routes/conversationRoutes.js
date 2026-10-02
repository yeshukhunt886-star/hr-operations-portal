const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");

const {
  createDirectConversation,
  getMyConversations,
  getConversationById,
} = require("../controllers/conversationController");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createDirectConversation);

router.get("/", getMyConversations);

router.get("/:id", getConversationById);

module.exports = router;