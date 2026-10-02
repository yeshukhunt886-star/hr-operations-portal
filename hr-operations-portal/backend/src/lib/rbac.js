import { prisma } from "../prisma.js";
import { HttpError } from "./errors.js";

export async function getManagedEmployeeIds(managerEmployeeId) {
  const ids = new Set();
  const queue = [managerEmployeeId];
  while (queue.length) {
    const current = queue.pop();
    const reports = await prisma.employee.findMany({
      where: { managerId: current },
      select: { id: true }
    });
    for (const r of reports) {
      if (!ids.has(r.id)) {
        ids.add(r.id);
        queue.push(r.id);
      }
    }
  }
  return ids;
}

export function isPrivileged(role) {
  return role === "ADMIN" || role === "HR";
}

export async function assertCanAccessEmployee(actor, targetEmployeeId, { allowSelf = true } = {}) {
  if (allowSelf && actor.employeeId === targetEmployeeId) return;
  if (isPrivileged(actor.role)) return;
  if (actor.role === "MANAGER") {
    const ids = await getManagedEmployeeIds(actor.employeeId);
    if (ids.has(targetEmployeeId)) return;
  }
  throw new HttpError(403, "Forbidden", "FORBIDDEN");
}

export function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, "Forbidden", "FORBIDDEN"));
    }
    next();
  };
}

export function forbidSensitiveNotFoundStyle() {
  return new HttpError(403, "Forbidden", "FORBIDDEN");
}
