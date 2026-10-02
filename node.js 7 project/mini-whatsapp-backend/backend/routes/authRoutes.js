import express from "express";

import {
    register,
    login,
    refreshAccessToken,
    logout,
    getMe
} from "../controllers/authController.js";

import authMiddleware from "../middleware/authMiddleware.js";

import {
    loginRateLimiter,
    registerRateLimiter,
    refreshRateLimiter
} from "../middleware/rateLimiter.js";

const router = express.Router();


// REGISTER
router.post(
    "/register",
    registerRateLimiter,
    register
);


// LOGIN
router.post(
    "/login",
    loginRateLimiter,
    login
);


// REFRESH TOKEN
router.post(
    "/refresh",
    refreshRateLimiter,
    refreshAccessToken
);


// LOGOUT
router.post(
    "/logout",
    logout
);


// CURRENT USER
router.get(
    "/me",
    authMiddleware,
    getMe
);


export default router;