import express from "express";

import {
    register,
    login
} from "../controllers/authController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Public Routes
router.post("/register", register);
router.post("/login", login);

// Admin Route
router.get(
    "/admin",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        res.json({
            message: "Welcome Admin"
        });
    }
);

// Staff Route
router.get(
    "/staff",
    authMiddleware,
    roleMiddleware("admin", "staff"),
    (req, res) => {
        res.json({
            message: "Welcome Staff"
        });
    }
);

// Viewer Route
router.get(
    "/viewer",
    authMiddleware,
    roleMiddleware("admin", "staff", "viewer"),
    (req, res) => {
        res.json({
            message: "Welcome Viewer"
        });
    }
);

export default router;