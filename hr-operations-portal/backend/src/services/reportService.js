import { prisma } from "../prisma.js";
import { monthRange, toDateColumn } from "../lib/time.js";
import { paginated } from "../lib/pagination.js";
import { getManagedEmployeeIds, isPrivileged } from "../lib/rbac.js";
import { HttpError } from "../lib/errors.js";

async function scopedEmployeeIds(actor, departmentId) {
  if (isPrivileged(actor.role)) {
    if (!departmentId) return null;
    const rows = await prisma.employee.findMany({ where: { departmentId }, select: { id: true } });
    return rows.map((r) => r.id);
  }
  if (actor.role === "MANAGER") {
    let ids = [...(await getManagedEmployeeIds(actor.employeeId))];
    if (departmentId) {
      const rows = await prisma.employee.findMany({
        where: { id: { in: ids }, departmentId },
        select: { id: true }
      });
      ids = rows.map((r) => r.id);
    }
    return ids;
  }
  return [actor.employeeId];
}

export async function attendanceSummary(actor, { year, month, departmentId, page, pageSize, skip, take }) {
  const { start, end } = monthRange(Number(year), Number(month));
  const ids = await scopedEmployeeIds(actor, departmentId);
  const empWhere = ids ? { id: { in: ids } } : departmentId ? { departmentId } : {};
  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where: empWhere,
      include: { department: true },
      orderBy: { employeeCode: "asc" },
      skip,
      take
    }),
    prisma.employee.count({ where: empWhere })
  ]);
  const items = [];
  for (const emp of employees) {
    const sessions = await prisma.attendanceSession.findMany({
      where: {
        employeeId: emp.id,
        businessDate: { gte: toDateColumn(start), lte: toDateColumn(end) }
      }
    });
    const worked = sessions.reduce((s, x) => s + (x.workedMinutes ?? x.durationMinutes ?? 0), 0);
    const late = sessions.reduce((s, x) => s + (x.lateMinutes || 0), 0);
    items.push({
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      name: `${emp.firstName} ${emp.lastName}`,
      department: emp.department.name,
      sessionCount: sessions.length,
      workedMinutes: worked,
      lateMinutes: late
    });
  }
  return paginated(items, total, page, pageSize);
}

export async function payrollSummary(actor, { year, month, departmentId, skip, take, page, pageSize }) {
  if (!isPrivileged(actor.role) && actor.role !== "MANAGER") {
    throw new HttpError(403, "Forbidden", "FORBIDDEN");
  }
  const ids = await scopedEmployeeIds(actor, departmentId);
  const where = {
    year: Number(year),
    month: Number(month),
    status: "FINALIZED",
    ...(ids ? { employeeId: { in: ids } } : {})
  };
  const [rows, total] = await Promise.all([
    prisma.payrollItem.findMany({
      where,
      include: { employee: { include: { department: true } } },
      skip,
      take,
      orderBy: { netPay: "desc" }
    }),
    prisma.payrollItem.count({ where })
  ]);
  return paginated(
    rows.map((r) => ({
      employeeId: r.employeeId,
      employeeCode: r.employee.employeeCode,
      name: `${r.employee.firstName} ${r.employee.lastName}`,
      department: r.employee.department.name,
      payableDays: r.payableDays,
      netPay: r.netPay,
      grossPay: r.grossPay
    })),
    total,
    page,
    pageSize
  );
}

export async function departmentSummary(actor, { year, month }) {
  if (!isPrivileged(actor.role)) throw new HttpError(403, "Forbidden", "FORBIDDEN");
  const { start, end } = monthRange(Number(year), Number(month));
  const departments = await prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  const items = [];
  for (const d of departments) {
    const employees = await prisma.employee.findMany({ where: { departmentId: d.id }, select: { id: true } });
    const empIds = employees.map((e) => e.id);
    const attendanceCount = empIds.length
      ? await prisma.attendanceSession.count({
          where: { employeeId: { in: empIds }, businessDate: { gte: toDateColumn(start), lte: toDateColumn(end) } }
        })
      : 0;
    const payroll = empIds.length
      ? await prisma.payrollItem.aggregate({
          where: { employeeId: { in: empIds }, year: Number(year), month: Number(month), status: "FINALIZED" },
          _sum: { netPay: true },
          _count: true
        })
      : { _sum: { netPay: 0 }, _count: 0 };
    items.push({
      departmentId: d.id,
      name: d.name,
      employeeCount: employees.length,
      attendanceSessions: attendanceCount,
      payrollCount: payroll._count,
      payrollNet: payroll._sum.netPay || 0
    });
  }
  return { items, year: Number(year), month: Number(month) };
}

export function listAudit({ skip, take, entityType }) {
  const where = entityType ? { entityType } : {};
  return Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { actor: { select: { email: true, role: true } } }
    }),
    prisma.auditLog.count({ where })
  ]);
}
