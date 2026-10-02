import { Router } from "express";
import { z } from "zod";
import { asyncHandler, HttpError } from "../lib/errors.js";
import { requireRoles } from "../lib/rbac.js";
import { parsePagination, paginated } from "../lib/pagination.js";
import * as employees from "../services/employeeService.js";
import { prisma } from "../prisma.js";
import { getPayslip } from "../services/payrollService.js";

export const employeeRouter = Router();

employeeRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const p = parsePagination(req.query);
    const { items, total } = await employees.listEmployees(req.user, req.query, p);
    res.json(paginated(items, total, p.page, p.pageSize));
  })
);

employeeRouter.post(
  "/",
  requireRoles("HR", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        employeeCode: z.string().min(2),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8).optional(),
        role: z.enum(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]).optional(),
        departmentId: z.string(),
        designationId: z.string(),
        managerId: z.string().nullable().optional(),
        joinDate: z.string(),
        exitDate: z.string().nullable().optional(),
        workStart: z.string().optional(),
        baseSalary: z.number().positive().optional(),
        leaveEntitlement: z.number().nonnegative().optional()
      })
      .parse(req.body);
    const created = await employees.createEmployee(req.user, body);
    res.status(201).json(created);
  })
);

employeeRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const includeSalary = req.query.includeSalary === "true";
    if (includeSalary && req.user.role === "EMPLOYEE" && req.user.employeeId !== req.params.id) {
      throw new HttpError(403, "Forbidden", "FORBIDDEN");
    }
    const emp = await employees.getEmployee(req.user, req.params.id, { includeSalary });
    res.json(emp);
  })
);

employeeRouter.patch(
  "/:id",
  requireRoles("HR", "ADMIN"),
  asyncHandler(async (req, res) => {
    const emp = await employees.updateEmployee(req.user, req.params.id, req.body);
    res.json(emp);
  })
);

employeeRouter.post(
  "/:id/salary",
  requireRoles("HR", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        baseSalary: z.number().positive(),
        effectiveFrom: z.string()
      })
      .parse(req.body);
    res.status(201).json(await employees.setSalary(req.user, req.params.id, body));
  })
);

employeeRouter.get(
  "/:id/payslips/:year/:month",
  asyncHandler(async (req, res) => {
    if (req.user.role === "EMPLOYEE" && req.user.employeeId !== req.params.id) {
      throw new HttpError(403, "Forbidden", "FORBIDDEN");
    }
    const item = await getPayslip(req.user, req.params.id, req.params.year, req.params.month);
    if (!item) {
      if (req.user.role === "EMPLOYEE") throw new HttpError(403, "Forbidden", "FORBIDDEN");
      return res.status(404).json({ error: "Payslip not found", code: "NOT_FOUND" });
    }
    res.json(item);
  })
);

export const orgRouter = Router();

orgRouter.get(
  "/departments",
  asyncHandler(async (_req, res) => {
    const items = await prisma.department.findMany({ orderBy: { name: "asc" } });
    res.json({ items });
  })
);

orgRouter.post(
  "/departments",
  requireRoles("HR", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z.object({ code: z.string(), name: z.string() }).parse(req.body);
    res.status(201).json(await prisma.department.create({ data: body }));
  })
);

orgRouter.delete(
  "/departments/:id",
  requireRoles("HR", "ADMIN"),
  asyncHandler(async (req, res) => {
    res.json(await employees.deactivateOrgUnit("department", req.params.id));
  })
);

orgRouter.get(
  "/designations",
  asyncHandler(async (_req, res) => {
    res.json({ items: await prisma.designation.findMany({ orderBy: { name: "asc" } }) });
  })
);

orgRouter.post(
  "/designations",
  requireRoles("HR", "ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z.object({ name: z.string() }).parse(req.body);
    res.status(201).json(await prisma.designation.create({ data: body }));
  })
);

orgRouter.delete(
  "/designations/:id",
  requireRoles("HR", "ADMIN"),
  asyncHandler(async (req, res) => {
    res.json(await employees.deactivateOrgUnit("designation", req.params.id));
  })
);
