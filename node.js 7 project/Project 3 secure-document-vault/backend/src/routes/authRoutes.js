import express from "express";

import {
  register,
  login,
  me,
  logout,
} from "../controllers/authController.js";

import {
  authenticate,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/register",
  register
);

router.post(
  "/login",
  login
);

router.get(
  "/me",
  authenticate,
  me
);

router.post(
  "/logout",
  authenticate,
  logout
);

export default router;