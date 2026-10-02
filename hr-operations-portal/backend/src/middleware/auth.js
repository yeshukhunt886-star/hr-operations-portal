import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";
import { config } from "../config.js";
import { HttpError } from "../lib/errors.js";

export async function authRequired(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      throw new HttpError(401, "Invalid or expired session", "UNAUTHENTICATED");
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { employee: true }
    });
    if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
      throw new HttpError(401, "Session revoked", "SESSION_REVOKED");
    }
    if (user.employee && (user.employee.status === "INACTIVE" || user.employee.status === "TERMINATED")) {
      throw new HttpError(401, "Account is not active", "ACCOUNT_INACTIVE");
    }
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id || null,
      employee: user.employee
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function optionalEmployeeIdFromSession(req) {
  if (!req.user.employeeId) {
    throw new HttpError(403, "No employee profile is linked to this account", "NO_EMPLOYEE");
  }
  return req.user.employeeId;
}
