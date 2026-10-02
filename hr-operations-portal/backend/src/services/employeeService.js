import argon2 from "argon2";
import { prisma } from "../prisma.js";
import { HttpError } from "../lib/errors.js";
import { writeAudit } from "../lib/audit.js";
import { dateOnly, toDateColumn } from "../lib/time.js";
import { isPrivileged, getManagedEmployeeIds } from "../lib/rbac.js";

const PUBLIC_EMPLOYEE = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  email: true,
  status: true,
  joinDate: true,
  exitDate: true,
  workStart: true,
  departmentId: true,
  designationId: true,
  managerId: true,
  department: true,
  designation: true
};

function validateDates(joinDate, exitDate) {
  const join = dateOnly(joinDate);
  const exit = exitDate ? dateOnly(exitDate) : null;
  if (exit && join > exit) throw new HttpError(400, "Join date cannot be after exit date", "INVALID_DATES");
  return { join, exit };
}

export async function createEmployee(actor, body) {
  const { join, exit } = validateDates(body.joinDate, body.exitDate);
  const passwordHash = await argon2.hash(body.password || "Password123!");
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: body.email.toLowerCase(),
          passwordHash,
          role: body.role || "EMPLOYEE"
        }
      });
      const employee = await tx.employee.create({
        data: {
          employeeCode: body.employeeCode,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email.toLowerCase(),
          status: body.status || "ACTIVE",
          joinDate: toDateColumn(join),
          exitDate: exit ? toDateColumn(exit) : null,
          workStart: body.workStart || "09:00",
          departmentId: body.departmentId,
          designationId: body.designationId,
          managerId: body.managerId || null,
          userId: user.id
        },
        include: { department: true, designation: true }
      });
      if (body.baseSalary) {
        await tx.salaryProfile.create({
          data: {
            employeeId: employee.id,
            baseSalary: body.baseSalary,
            effectiveFrom: toDateColumn(join)
          }
        });
      }
      const leaveTypes = await tx.leaveType.findMany({ where: { isActive: true, paid: true } });
      for (const lt of leaveTypes) {
        await tx.leaveBalance.create({
          data: {
            employeeId: employee.id,
            leaveTypeId: lt.id,
            year: join.year,
            entitled: body.leaveEntitlement ?? 18
          }
        });
      }
      await writeAudit(tx, {
        actorUserId: actor.id,
        action: "EMPLOYEE_CREATED",
        entityType: "Employee",
        entityId: employee.id,
        metadata: { employeeCode: employee.employeeCode }
      });
      return employee;
    });
  } catch (err) {
    if (err.code === "P2002") {
      throw new HttpError(409, "Employee email or code already exists", "DUPLICATE");
    }
    throw err;
  }
}

export async function updateEmployee(actor, id, body) {
  const existing = await prisma.employee.findUnique({ where: { id }, include: { user: true } });
  if (!existing) throw new HttpError(404, "Employee not found", "NOT_FOUND");
  const data = {};
  if (body.firstName) data.firstName = body.firstName;
  if (body.lastName) data.lastName = body.lastName;
  if (body.departmentId) data.departmentId = body.departmentId;
  if (body.designationId) data.designationId = body.designationId;
  if (body.managerId !== undefined) data.managerId = body.managerId || null;
  if (body.workStart) data.workStart = body.workStart;
  if (body.status) data.status = body.status;
  if (body.joinDate || body.exitDate !== undefined) {
    const join = dateOnly(body.joinDate || existing.joinDate);
    const exit = body.exitDate === null || body.exitDate === ""
      ? null
      : dateOnly(body.exitDate || existing.exitDate || body.joinDate);
    if (exit && join > exit) throw new HttpError(400, "Join date cannot be after exit date", "INVALID_DATES");
    data.joinDate = toDateColumn(join);
    data.exitDate = exit ? toDateColumn(exit) : null;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const emp = await tx.employee.update({
      where: { id },
      data,
      include: { department: true, designation: true, user: true }
    });
    if (body.status === "INACTIVE" || body.status === "TERMINATED") {
      await tx.user.update({
        where: { id: existing.userId },
        data: { isActive: false, tokenVersion: { increment: 1 } }
      });
    }
    if (body.status === "ACTIVE") {
      await tx.user.update({
        where: { id: existing.userId },
        data: { isActive: true }
      });
    }
    if (body.role) {
      await tx.user.update({ where: { id: existing.userId }, data: { role: body.role } });
    }
    await writeAudit(tx, {
      actorUserId: actor.id,
      action: "EMPLOYEE_UPDATED",
      entityType: "Employee",
      entityId: id,
      metadata: { changes: Object.keys(data), previousDepartmentId: existing.departmentId }
    });
    return emp;
  });
  return updated;
}

export async function listEmployees(actor, query, pagination) {
  const where = {};
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { firstName: { contains: query.q } },
      { lastName: { contains: query.q } },
      { employeeCode: { contains: query.q } },
      { email: { contains: query.q } }
    ];
  }
  if (actor.role === "MANAGER") {
    const ids = [...(await getManagedEmployeeIds(actor.employeeId))];
    where.id = { in: ids };
  } else if (actor.role === "EMPLOYEE") {
    where.id = actor.employeeId;
  }
  const [items, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      select: PUBLIC_EMPLOYEE,
      orderBy: { employeeCode: "asc" },
      skip: pagination.skip,
      take: pagination.take
    }),
    prisma.employee.count({ where })
  ]);
  return { items, total };
}

export async function getEmployee(actor, id, { includeSalary = false } = {}) {
  if (actor.role === "EMPLOYEE" && actor.employeeId !== id) {
    throw new HttpError(403, "Forbidden", "FORBIDDEN");
  }
  if (actor.role === "MANAGER") {
    const ids = await getManagedEmployeeIds(actor.employeeId);
    if (actor.employeeId !== id && !ids.has(id)) throw new HttpError(403, "Forbidden", "FORBIDDEN");
  }
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      designation: true,
      manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      user: { select: { role: true, isActive: true } }
    }
  });
  if (!employee) {
    if (!isPrivileged(actor.role) && actor.employeeId !== id) throw new HttpError(403, "Forbidden", "FORBIDDEN");
    throw new HttpError(404, "Employee not found", "NOT_FOUND");
  }
  const result = { ...employee };
  if (includeSalary && (isPrivileged(actor.role) || actor.employeeId === id)) {
    result.salaryProfiles = await prisma.salaryProfile.findMany({
      where: { employeeId: id },
      orderBy: { effectiveFrom: "desc" }
    });
  }
  return result;
}

export async function setSalary(actor, employeeId, { baseSalary, effectiveFrom }) {
  if (!isPrivileged(actor.role)) throw new HttpError(403, "Forbidden", "FORBIDDEN");
  const profile = await prisma.salaryProfile.create({
    data: {
      employeeId,
      baseSalary,
      effectiveFrom: toDateColumn(dateOnly(effectiveFrom))
    }
  });
  await writeAudit(null, {
    actorUserId: actor.id,
    action: "SALARY_UPDATED",
    entityType: "SalaryProfile",
    entityId: profile.id,
    metadata: { employeeId, baseSalary }
  });
  return profile;
}

export async function deactivateOrgUnit(type, id) {
  const count = await prisma.employee.count({
    where: type === "department" ? { departmentId: id, status: "ACTIVE" } : { designationId: id, status: "ACTIVE" }
  });
  if (count > 0) {
    throw new HttpError(409, `Cannot delete ${type} with active employees; reassign or deactivate first`, "IN_USE");
  }
  if (type === "department") {
    return prisma.department.update({ where: { id }, data: { isActive: false } });
  }
  return prisma.designation.update({ where: { id }, data: { isActive: false } });
}
