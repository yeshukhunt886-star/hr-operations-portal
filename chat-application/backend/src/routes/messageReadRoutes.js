
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");

const {
  markMessageAsRead,
} = require("../controllers/messageReadController");

const router = express.Router();

router.use(authMiddleware);

router.post("/:id/read", markMessageAsRead);

module.exports = router;

