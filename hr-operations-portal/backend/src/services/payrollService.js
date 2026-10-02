import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../prisma.js";
import { HttpError } from "../lib/errors.js";
import { writeAudit } from "../lib/audit.js";
import { monthRange, dateOnly, clampInterval, toDateColumn } from "../lib/time.js";
import { workingDaysInRange } from "../lib/calendar.js";
import { roundMoney, toDecimal, assertNonNegativeMoney } from "../lib/money.js";
import { isPrivileged } from "../lib/rbac.js";

/**
 * Payroll formula (documented in README):
 * workingDaysInMonth = weekdays in calendar month minus company/dept holidays
 * serviceStart/end = clip [monthStart, monthEnd] to [joinDate, exitDate or monthEnd]
 * payableWorkingDays = working days in clipped service interval
 * unpaidLeaveDays = sum of chargeable unpaid APPROVED leave overlapping the clipped interval
 * paidLeaveDays = sum of chargeable paid APPROVED leave overlapping the clipped interval
 * payableDays = payableWorkingDays (attendance is not required to earn a working day;
 * unpaid leave reduces payable days)
 * dailyRate = baseSalary / workingDaysInMonth  (if workingDaysInMonth is 0, net = bonus - deduction)
 * grossPay = round(dailyRate * (payableWorkingDays - unpaidLeaveDays), 2)
 * netPay = round(grossPay + bonus - deduction, 2)
 * Rounding: decimal HALF_UP to 2 places for money; dailyRate stored at 4 places HALF_UP.
 */

export function computePayable({
  baseSalary,
  workingDaysInMonth,
  payableWorkingDays,
  unpaidLeaveDays,
  bonus,
  deduction
}) {
  const salary = toDecimal(baseSalary);
  const wd = Number(workingDaysInMonth);
  const unpaid = toDecimal(unpaidLeaveDays);
  const bonusD = assertNonNegativeMoney(bonus, "bonus");
  const dedD = assertNonNegativeMoney(deduction, "deduction");

  if (wd <= 0) {
    const net = roundMoney(bonusD.minus(dedD));

    return {
      dailyRate: roundMoney(0, 4),
      grossPay: roundMoney(0).toFixed(2),
      netPay: net.toFixed(2),
      payableDays: roundMoney(0)
    };
  }

  const dailyRate = roundMoney(salary.div(wd), 4);

  const payableDays = roundMoney(
    toDecimal(payableWorkingDays).minus(unpaid),
    2
  );

  if (payableDays.lessThan(0)) {
    throw new HttpError(
      400,
      "Payable days would be negative",
      "PAYROLL_CALC"
    );
  }

  const grossPay = roundMoney(
    dailyRate.mul(payableDays)
  );

  const netPay = roundMoney(
    grossPay.plus(bonusD).minus(dedD)
  );

  return {
    dailyRate,
    grossPay: grossPay.toFixed(2),
    netPay: netPay.toFixed(2),
    payableDays,
    bonus: bonusD,
    deduction: dedD
  };
}

async function overlapLeaveDays(employeeId, start, end, paid) {
  const requests = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: "APPROVED",
      leaveType: { paid },
      startDate: { lte: toDateColumn(end) },
      endDate: { gte: toDateColumn(start) }
    },
    include: { leaveType: true }
  });
  let total = new Decimal(0);
  for (const req of requests) {
    const rs = dateOnly(req.startDate);
    const re = dateOnly(req.endDate);
    const clipped = clampInterval(rs, re, start, end);
    if (!clipped) continue;
    const days = await workingDaysInRange(clipped.start, clipped.end);
    total = total.plus(days);
  }
  return total;
}

export async function generatePayroll(actor, { year, month, bonuses = {}, deductions = {}, reopen = false }) {
  if (!isPrivileged(actor.role)) throw new HttpError(403, "Forbidden", "FORBIDDEN");
  if (month < 1 || month > 12) throw new HttpError(400, "Invalid month", "INVALID_MONTH");
  const { start: monthStart, end: monthEnd } = monthRange(year, month);

  const existingKeys = await prisma.finalizedPayrollKey.findMany({ where: { year, month } });
  if (existingKeys.length && !reopen) {
    throw new HttpError(409, "Finalized payroll already exists for this month", "PAYROLL_EXISTS");
  }

  if (reopen && existingKeys.length) {
    await prisma.$transaction(async (tx) => {
      await tx.payrollItem.updateMany({
        where: { year, month, status: "FINALIZED" },
        data: { status: "SUPERSEDED" }
      });
      await tx.finalizedPayrollKey.deleteMany({ where: { year, month } });
      await tx.payrollRun.updateMany({
        where: { year, month, status: "FINALIZED" },
        data: { status: "REOPENED", reopenedAt: new Date() }
      });
      await writeAudit(tx, {
        actorUserId: actor.id,
        action: "PAYROLL_REOPENED",
        entityType: "PayrollRun",
        entityId: `${year}-${month}`,
        metadata: { year, month }
      });
    });
  }

  const run = await prisma.payrollRun.create({
    data: { year, month, status: "PROCESSING", createdById: actor.id }
  });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const employees = await tx.employee.findMany({
        include: { salaryProfiles: { orderBy: { effectiveFrom: "desc" } } }
      });

      for (const emp of employees) {
        const join = dateOnly(emp.joinDate);
        const exit = emp.exitDate ? dateOnly(emp.exitDate) : null;
        if (join > monthEnd) continue;
        if (exit && exit < monthStart) continue;

        const profile = emp.salaryProfiles.find((p) => dateOnly(p.effectiveFrom) <= monthEnd);
        if (!profile) continue;

        const serviceStart = join > monthStart ? join : monthStart;
        const serviceEnd = exit && exit < monthEnd ? exit : monthEnd;
        const workingDaysInMonth = await workingDaysInRange(monthStart, monthEnd, emp.departmentId);
        const payableWorkingDays = await workingDaysInRange(serviceStart, serviceEnd, emp.departmentId);
        const unpaidLeaveDays = await overlapLeaveDays(emp.id, serviceStart, serviceEnd, false);
        const paidLeaveDays = await overlapLeaveDays(emp.id, serviceStart, serviceEnd, true);
        const attendanceDays = await tx.attendanceSession.count({
          where: {
            employeeId: emp.id,
            status: "CLOSED",
            businessDate: { gte: toDateColumn(serviceStart), lte: toDateColumn(serviceEnd) }
          }
        });

        const bonus = bonuses[emp.id] ?? 0;
        const deduction = deductions[emp.id] ?? 0;
        const calc = computePayable({
          baseSalary: profile.baseSalary,
          workingDaysInMonth,
          payableWorkingDays,
          unpaidLeaveDays,
          bonus,
          deduction
        });

        const item = await tx.payrollItem.create({
          data: {
            payrollRunId: run.id,
            employeeId: emp.id,
            year,
            month,
            status: "FINALIZED",
            baseSalary: profile.baseSalary,
            workingDaysInMonth,
            payableDays: calc.payableDays,
            attendanceDays,
            paidLeaveDays,
            unpaidLeaveDays,
            dailyRate: calc.dailyRate,
            bonus: calc.bonus,
            deduction: calc.deduction,
            grossPay: calc.grossPay,
            netPay: calc.netPay,
            formulaSnapshot: {
              workingDaysInMonth,
              payableWorkingDays,
              unpaidLeaveDays: String(unpaidLeaveDays),
              paidLeaveDays: String(paidLeaveDays),
              rounding: "HALF_UP"
            }
          }
        });
        await tx.finalizedPayrollKey.create({
          data: { employeeId: emp.id, year, month, itemId: item.id }
        });
      }

      const finalized = await tx.payrollRun.update({
        where: { id: run.id },
        data: { status: "FINALIZED", finalizedAt: new Date() },
        include: {
          items: {
            include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } }
          }
        }
      });
      await writeAudit(tx, {
        actorUserId: actor.id,
        action: "PAYROLL_FINALIZED",
        entityType: "PayrollRun",
        entityId: run.id,
        metadata: { year, month, itemCount: finalized.items.length }
      });
      return finalized;
    }, { timeout: 60000 });
    return result;
  } catch (err) {
    await prisma.payrollRun.update({
      where: { id: run.id },
      data: { status: "FAILED", errorMessage: err.message || String(err) }
    });
    if (err.code === "P2002") {
      throw new HttpError(409, "Finalized payroll already exists for an employee in this month", "PAYROLL_EXISTS");
    }
    throw err;
  }
}

export async function getPayslip(actor, employeeId, year, month) {
  const self = actor.employeeId === employeeId;
  if (!self && !isPrivileged(actor.role)) {
    throw new HttpError(403, "Forbidden", "FORBIDDEN");
  }
  const item = await prisma.payrollItem.findFirst({
    where: { employeeId, year: Number(year), month: Number(month), status: "FINALIZED" },
    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } }
  });
  if (!item) {
    if (self || isPrivileged(actor.role)) return null;
    throw new HttpError(403, "Forbidden", "FORBIDDEN");
  }
  return item;
}




