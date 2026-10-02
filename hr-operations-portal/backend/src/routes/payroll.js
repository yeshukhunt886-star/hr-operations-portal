import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/errors.js";
import { requireRoles } from "../lib/rbac.js";
import { parsePagination, paginated } from "../lib/pagination.js";
import { generatePayroll } from "../services/payrollService.js";
import { attendanceSummary, payrollSummary, departmentSummary, listAudit } from "../services/reportService.js";
import { prisma } from "../prisma.js";

export const payrollRouter = Router();

payrollRouter.post(
  "/generate",
  requireRoles("HR", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
        bonuses: z.record(z.number()).optional(),
        deductions: z.record(z.number()).optional(),
        reopen: z.boolean().optional()
      })
      .parse(req.body);
    const run = await generatePayroll(req.user, body);
    res.status(201).json(run);
  })
);

payrollRouter.get(
  "/runs",
  requireRoles("HR", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const p = parsePagination(req.query);
    const [items, total] = await Promise.all([
      prisma.payrollRun.findMany({ orderBy: { createdAt: "desc" }, skip: p.skip, take: p.take }),
      prisma.payrollRun.count()
    ]);
    res.json(paginated(items, total, p.page, p.pageSize));
  })
);

payrollRouter.get(
  "/runs/:id",
  requireRoles("HR", "ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const run = await prisma.payrollRun.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: { employee: { select: { employeeCode: true, firstName: true, lastName: true, departmentId: true } } }
        }
      }
    });
    res.json(run);
  })
);

export const reportRouter = Router();

reportRouter.get(
  "/attendance",
  asyncHandler(async (req, res) => {
    const p = parsePagination(req.query);
    res.json(await attendanceSummary(req.user, { ...req.query, ...p }));
  })
);

reportRouter.get(
  "/payroll",
  asyncHandler(async (req, res) => {
    const p = parsePagination(req.query);
    res.json(await payrollSummary(req.user, { ...req.query, ...p }));
  })
);

reportRouter.get(
  "/departments",
  requireRoles("HR", "ADMIN"),
  asyncHandler(async (req, res) => {
    res.json(await departmentSummary(req.user, req.query));
  })
);

export const auditRouter = Router();

auditRouter.get(
  "/",
  requireRoles("HR", "ADMIN"),
  asyncHandler(async (req, res) => {
    const p = parsePagination(req.query);
    const [items, total] = await listAudit({ ...p, entityType: req.query.entityType });
    res.json(paginated(items, total, p.page, p.pageSize));
  })
);
