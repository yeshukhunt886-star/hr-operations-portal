import express from "express";

import authMiddleware
from "../middleware/authMiddleware.js";

import {
getAllUsers
} from "../controllers/userController.js";

const router = express.Router();

// GET ALL USERS
// GET /api/users

router.get(
"/",
authMiddleware,
getAllUsers
);

export default router;
