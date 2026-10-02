import { Router } from "express";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { config } from "../config.js";
import { HttpError, asyncHandler } from "../lib/errors.js";
import { authRequired } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      include: { employee: { include: { department: true, designation: true } } }
    });
    if (!user || !user.isActive) throw new HttpError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    const ok = await argon2.verify(user.passwordHash, body.password);
    if (!ok) throw new HttpError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    if (user.employee && (user.employee.status === "INACTIVE" || user.employee.status === "TERMINATED")) {
      throw new HttpError(401, "Account is not active", "ACCOUNT_INACTIVE");
    }
    const token = jwt.sign({ sub: user.id, tv: user.tokenVersion, role: user.role }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee: user.employee
          ? {
              id: user.employee.id,
              firstName: user.employee.firstName,
              lastName: user.employee.lastName,
              employeeCode: user.employee.employeeCode,
              department: user.employee.department,
              designation: user.employee.designation
            }
          : null
      }
    });
  })
);

authRouter.get(
  "/me",
  authRequired,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);
