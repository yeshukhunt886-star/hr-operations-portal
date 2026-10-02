import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/errors.js";
import { parsePagination, paginated } from "../lib/pagination.js";
import { requireRoles } from "../lib/rbac.js";
import * as leave from "../services/leaveService.js";
import { prisma } from "../prisma.js";
import { writeAudit } from "../lib/audit.js";
import { dateOnly, toDateColumn } from "../lib/time.js";

export const leaveRouter = Router();

leaveRouter.get(
  "/types",
  asyncHandler(async (_req, res) => {
    res.json({ items: await prisma.leaveType.findMany({ orderBy: { name: "asc" } }) });
  })
);

leaveRouter.post(
  "/types",
  requireRoles("HR", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z.object({ code: z.string(), name: z.string(), paid: z.boolean().optional() }).parse(req.body);
    res.status(201).json(await prisma.leaveType.create({ data: body }));
  })
);

leaveRouter.patch(
  "/types/:id",
  requireRoles("HR", "ADMIN"),
  asyncHandler(async (req, res) => {
    const updated = await prisma.leaveType.update({
      where: { id: req.params.id },
      data: { isActive: req.body.isActive, name: req.body.name }
    });
    res.json(updated);
  })
);

leaveRouter.get(
  "/requests",
  asyncHandler(async (req, res) => {
    const p = parsePagination(req.query);
    const { items, total } = await leave.listLeaveForActor(req.user, req.query, p);
    res.json(paginated(items, total, p.page, p.pageSize));
  })
);

leaveRouter.post(
  "/requests/:id/approve",
  requireRoles("MANAGER", "HR", "ADMIN"),
  asyncHandler(async (req, res) => {
    res.json(await leave.transitionLeave(req.user, req.params.id, "APPROVED", req.body?.note));
  })
);

leaveRouter.post(
  "/requests/:id/reject",
  requireRoles("MANAGER", "HR", "ADMIN"),
  asyncHandler(async (req, res) => {
    res.json(await leave.transitionLeave(req.user, req.params.id, "REJECTED", req.body?.note));
  })
);

leaveRouter.post(
  "/requests/:id/reopen",
  requireRoles("HR", "ADMIN"),
  asyncHandler(async (req, res) => {
    res.json(await leave.transitionLeave(req.user, req.params.id, "PENDING", req.body?.note));
  })
);

leaveRouter.post(
  "/requests/:id/cancel",
  asyncHandler(async (req, res) => {
    res.json(await leave.transitionLeave(req.user, req.params.id, "CANCELLED", req.body?.note));
  })
);

export const holidayRouter = Router();

holidayRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const year = Number(req.query.year || new Date().getFullYear());
    const items = await prisma.holiday.findMany({
      where: {
        date: {
          gte: toDateColumn(dateOnly(`${year}-01-01`)),
          lte: toDateColumn(dateOnly(`${year}-12-31`))
        }
      },
      include: { department: true },
      orderBy: { date: "asc" }
    });
    res.json({ items });
  })
);

holidayRouter.post(
  "/",
  requireRoles("HR", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({ date: z.string(), name: z.string(), departmentId: z.string().nullable().optional() })
      .parse(req.body);
    const created = await prisma.holiday.create({
      data: {
        date: toDateColumn(dateOnly(body.date)),
        name: body.name,
        departmentId: body.departmentId || null
      }
    });
    await writeAudit(null, {
      actorUserId: req.user.id,
      action: "HOLIDAY_CREATED",
      entityType: "Holiday",
      entityId: created.id
    });
    res.status(201).json(created);
  })
);

holidayRouter.delete(
  "/:id",
  requireRoles("HR", "ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.holiday.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);
