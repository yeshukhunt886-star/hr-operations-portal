import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../prisma.js";
import { HttpError } from "../lib/errors.js";
import { writeAudit } from "../lib/audit.js";
import { dateOnly, nowTz, toDateColumn } from "../lib/time.js";
import { chargeableDays } from "../lib/calendar.js";
import { getManagedEmployeeIds, isPrivileged } from "../lib/rbac.js";
import { createNotification } from "./notificationService.js";

const EMPLOYEE_CANCEL = {
  PENDING: ["CANCELLED"]
};

const HR_TRANSITIONS = {
  PENDING: ["APPROVED", "REJECTED", "CANCELLED"],
  REJECTED: ["PENDING"],
  CANCELLED: ["PENDING"],
  APPROVED: ["CANCELLED"]
};

// Check whether the employee already has a pending/approved
// leave request that overlaps the requested date range.
async function overlapExists(tx, employeeId, start, end, excludeId) {
  const clashes = await tx.leaveRequest.findMany({
    where: {
      employeeId,
      status: { in: ["PENDING", "APPROVED"] },
      ...(excludeId
        ? { id: { not: excludeId } }
        : {}),
      startDate: { lte: toDateColumn(end) },
      endDate: { gte: toDateColumn(start) }
    }
  });
  return clashes.length > 0;
}

// Update used leave balance.
async function adjustBalance(
  tx,
  { employeeId, leaveTypeId, year, deltaUsed }
) {
  const row = await tx.leaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId_year: {
        employeeId,
        leaveTypeId,
        year
      }
    }
  });

  if (!row) {
    throw new HttpError(
      400,
      "No leave balance for this type/year",
      "NO_BALANCE"
    );
  }

  const used = new Decimal(row.used).plus(deltaUsed);
  const entitled = new Decimal(row.entitled);

  if (used.lessThan(0)) {
    throw new HttpError(
      409,
      "Leave balance would go negative",
      "BALANCE_ERROR"
    );
  }

  if (used.greaterThan(entitled)) {
    throw new HttpError(
      409,
      "Requested leave exceeds available balance",
      "INSUFFICIENT_BALANCE"
    );
  }

  await tx.leaveBalance.update({
    where: { id: row.id },
    data: { used }
  });
}

// Employee requests leave.
export async function requestLeave(actor, body) {
  if (!actor) {
    throw new HttpError(
      401,
      "Authentication required",
      "UNAUTHORIZED"
    );
  }

  const employeeId = actor.employeeId;
  if (!employeeId) {
    throw new HttpError(
      403,
      "No employee profile is linked to this user",
      "NO_EMPLOYEE"
    );
  }

  const start = dateOnly(body.startDate);
  const end = dateOnly(body.endDate);
  if (end < start) {
    throw new HttpError(
      400,
      "Leave end date is before start date",
      "INVALID_RANGE"
    );
  }

  // Confirm the employee exists.
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId }
  });

  if (!employee) {
    throw new HttpError(
      404,
      "Employee profile not found",
      "EMPLOYEE_NOT_FOUND"
    );
  }

  // Confirm leave type exists and is active.
  const leaveType = await prisma.leaveType.findUnique({
    where: { id: body.leaveTypeId }
  });

  if (!leaveType || !leaveType.isActive) {
    throw new HttpError(
      400,
      "Leave type is not available",
      "LEAVE_TYPE_INACTIVE"
    );
  }

  // Prevent leave from being requested on company holidays.
  const holiday = await prisma.holiday.findFirst({
    where: {
      date: {
        gte: toDateColumn(start),
        lte: toDateColumn(end)
      }
    }
  });

  if (holiday) {
    throw new HttpError(
      409,
      `Leave cannot be applied on company holiday: ${dateOnly(
        holiday.date
      ).toISODate()}.`,
      "HOLIDAY_CONFLICT"
    );
  }

  // Prevent leave from being requested on Sunday.
  // Luxon weekday:
  // Monday = 1
  // Tuesday = 2
  // Wednesday = 3
  // Thursday = 4
  // Friday = 5
  // Saturday = 6
  // Sunday = 7
  let currentDate = start;
  while (currentDate <= end) {
    if (currentDate.weekday === 7) {
      throw new HttpError(
        409,
        `Leave cannot be applied on Sunday: ${currentDate.toISODate()}.`,
        "SUNDAY_CONFLICT"
      );
    }
    currentDate = currentDate.plus({ days: 1 });
  }

  // Calculate chargeable working days.
let days = await chargeableDays(
  start,
  end,
  employee.departmentId
);

// Half-day leave is allowed only for a single working day.
const dayType = body.dayType || "FULL_DAY";
if (!["FULL_DAY", "FIRST_HALF", "SECOND_HALF"].includes(dayType)) {
  throw new HttpError(
    400,
    "Invalid leave day type",
    "INVALID_DAY_TYPE"
  );
}

if ((dayType === "FIRST_HALF" || dayType === "SECOND_HALF") &&start.toISODate() !== end.toISODate()) {
  throw new HttpError(
    400,
    "Half-day leave can only be applied for one day.",
    "HALF_DAY_SINGLE_DATE"
  );
}

if ((dayType === "FIRST_HALF" || dayType === "SECOND_HALF") &&days !== 1) {
  throw new HttpError(
    409,
    "Half-day leave can only be applied on a working day.",
    "HALF_DAY_NOT_WORKING_DAY"
  );
}

if (dayType === "FIRST_HALF" ||dayType === "SECOND_HALF") {
  days = 0.5;
}

  return prisma.$transaction(async (tx) => {
    // Database-independent employee lookup inside
    // the transaction.
    // IMPORTANT:
    // Do NOT use PostgreSQL-specific SQL.
    const lockedEmployee = await tx.employee.findUnique({
      where: { id: employeeId },
      select: { id: true }
    });
    if (!lockedEmployee) {
      throw new HttpError(
        404,
        "Employee profile not found",
        "EMPLOYEE_NOT_FOUND"
      );
    }

    // Prevent overlapping leave.
    const hasOverlap = await overlapExists(
      tx,
      employeeId,
      start,
      end
    );

    if (hasOverlap) {
      throw new HttpError(
        409,
        "You already have a pending or approved leave request for one or more of these dates.",
        "LEAVE_OVERLAP"
      );
    }

    // Check paid leave balance.
    if (leaveType.paid && days > 0) {
      const year = start.year;
      const balance = await tx.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId,
            leaveTypeId: leaveType.id,
            year
          }
        }
      });

      if (!balance) {
        throw new HttpError(
          400,
          "No leave balance exists for this leave type and year.",
          "NO_BALANCE"
        );
      }

      const entitled = new Decimal(balance.entitled);
      const used = new Decimal(balance.used);
      const remaining = entitled.minus(used);
      if (remaining.lessThan(days)) {
        throw new HttpError(
          409,
          `Insufficient leave balance. Available: ${remaining.toString()} day(s), requested: ${days} day(s).`,
          "INSUFFICIENT_BALANCE"
        );
      }
    }

    // Create leave request.
 const created = await tx.leaveRequest.create({
  data: {
    employeeId,
    leaveTypeId: leaveType.id,
    startDate: toDateColumn(start),
    endDate: toDateColumn(end),
    daysCharged: days,
    dayType,
    reason: body.reason || ""
  },
      include: {
        leaveType: true
      }
    });
    // Audit log.
    await writeAudit(tx, {
      actorUserId: actor.id,
      action: "LEAVE_REQUESTED",
      entityType: "LeaveRequest",
      entityId: created.id,
      metadata: {
        daysCharged: days
      }
    });
    return created;
  });
}

// Approve / reject / cancel / reopen leave.
export async function transitionLeave(
  actor,
  id,
  nextStatus,
  note
) {
  if (!actor) {
    throw new HttpError(
      401,
      "Authentication required",
      "UNAUTHORIZED"
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const req = await tx.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: true,
        leaveType: true
      }
    });

    if (!req) {
      throw new HttpError(
        404,
        "Leave request not found",
        "NOT_FOUND"
      );
    }

    const allowed = await allowedTransitions(actor, req);
    if (!allowed.includes(nextStatus)) {
      throw new HttpError(
        409,
        `Cannot change leave from ${req.status} to ${nextStatus}`,
        "INVALID_TRANSITION"
      );
    }

    // Optimistic concurrency check.
    const updated = await tx.leaveRequest.updateMany({
      where: {
        id,
        version: req.version,
        status: req.status
      },
      data: {
        status: nextStatus,
        version: { increment: 1 },
        decidedById: actor.employeeId || null,
        decidedAt: new Date(),
        decisionNote: note || null
      }
    });

    if (updated.count !== 1) {
      throw new HttpError(
        409,
        "Leave request was already updated by another user",
        "CONCURRENT_UPDATE"
      );
    }

    // Approving paid leave uses leave balance.
    if ( req.status === "PENDING" &&nextStatus === "APPROVED" &&req.leaveType.paid) {
      await adjustBalance(tx, {
        employeeId: req.employeeId,
        leaveTypeId: req.leaveTypeId,
        year: dateOnly(req.startDate).year,
        deltaUsed: new Decimal(req.daysCharged)
      });
    }

    // Cancelling approved paid leave returns balance.
    if (req.status === "APPROVED" &&nextStatus === "CANCELLED" && req.leaveType.paid
    ) {
      await assertPayrollNotFinalized(tx, req);
      await adjustBalance(tx, {
        employeeId: req.employeeId,
        leaveTypeId: req.leaveTypeId,
        year: dateOnly(req.startDate).year,
        deltaUsed: new Decimal(req.daysCharged).negated()
      });
    }
    // Audit.
    await writeAudit(tx, {
      actorUserId: actor.id,
      action: `LEAVE_${nextStatus}`,
      entityType: "LeaveRequest",
      entityId: id,
      metadata: {
        from: req.status,
        to: nextStatus
      }
    });
    const leave = await tx.leaveRequest.findUnique({
      where: { id },
      include: {
        leaveType: true,
        employee: true
      }
    });
    return {
      leave,
      employeeUserId: req.employee.userId,
      leaveTypeName: req.leaveType.name,
      fromStatus: req.status,
      toStatus: nextStatus
    };
  });

  // Create employee notification after the transaction succeeds.
  if (result.fromStatus === "PENDING" &&(result.toStatus === "APPROVED" || result.toStatus === "REJECTED")
  ) {
    const isApproved = result.toStatus === "APPROVED";
    await createNotification({
      userId: result.employeeUserId,
      title: isApproved
        ? "Leave Approved"
        : "Leave Rejected",
      message: isApproved
        ? `Your ${result.leaveTypeName} leave request has been approved.`
        : `Your ${result.leaveTypeName} leave request has been rejected.`,
      type: "LEAVE"
    });
  }
  return result.leave;
}

// Prevent changing approved leave after payroll
// has already been finalized for that month.
async function assertPayrollNotFinalized(tx, req) {
  const start = dateOnly(req.startDate);
  const item = await tx.payrollItem.findFirst({
    where: {
      employeeId: req.employeeId,
      status: "FINALIZED",
      year: start.year,
      month: start.month
    }
  });

  if (item) {
    throw new HttpError(
      409,
      "Cannot change leave covered by finalized payroll; reopen payroll first",
      "PAYROLL_LOCKED"
    );
  }
}

// Determine which leave transitions the actor
// is allowed to perform.
async function allowedTransitions(actor, req) {
  if (!actor || !actor.employeeId) {
    return [];
  }

  const today = nowTz().startOf("day");
  const start = dateOnly(req.startDate);
  const isSelf = actor.employeeId === req.employeeId;
  const hr = isPrivileged(actor.role);

  // Employee cancelling own leave.
  if (isSelf && actor.role !== "ADMIN") {
    if (req.status === "PENDING") {
      return ["CANCELLED"];
    }
    if ( req.status === "APPROVED" && start > today) {
      return ["CANCELLED"];
    }
    return [];
  }

  // Manager can approve/reject direct reports.
  if (actor.role === "MANAGER") {
    if (isSelf) {
      return [];
    }
    const ids = await getManagedEmployeeIds(actor.employeeId );
    if (!ids.has(req.employeeId)) {
      return [];
    }
    if (req.status === "PENDING") {
      return ["APPROVED", "REJECTED"];
    }
    return [];
  }

  // HR and ADMIN.
  if (hr) {
    return HR_TRANSITIONS[req.status] || [];
  }
  return EMPLOYEE_CANCEL[req.status] || [];
}

// List leave requests visible to the actor.
export async function listLeaveForActor(
  actor,
  query = {},
  pagination = {}
) {
  if (!actor) {
    throw new HttpError(
      401,
      "Authentication required",
      "UNAUTHORIZED"
    );
  }

  const where = {};

  // Employee:
  // only own leave.
  if ( query.mine === "true" || actor.role === "EMPLOYEE") {
    if (!actor.employeeId) {
      throw new HttpError(
        403,
        "No employee profile is linked to this user",
        "NO_EMPLOYEE"
      );
    }
    where.employeeId = actor.employeeId;
  }

  // Manager:
  // only managed employees.
  else if (actor.role === "MANAGER") {
    if (!actor.employeeId) {
      throw new HttpError(
        403,
        "No employee profile is linked to this manager",
        "NO_EMPLOYEE"
      );
    }

    const ids = [
      ...(await getManagedEmployeeIds(
        actor.employeeId
      ))
    ];

    if (ids.length === 0) {
      return {
        items: [],
        total: 0
      };
    }

    where.employeeId = { in: ids };
  }

  // HR and ADMIN:
  // see all leave requests.
  if (query.status) {
    where.status = query.status;
  }

  const skip = Number.isInteger(pagination.skip)
    ? pagination.skip
    : 0;

  const take = Number.isInteger(pagination.take)
    ? pagination.take
    : 20;

  const [items, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            departmentId: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take
    }),

    prisma.leaveRequest.count({
      where
    })
  ]);

  return {
    items,
    total
  };
}

// Get current-year leave balances.
export async function getBalances(employeeId) {
  if (!employeeId) {
    throw new HttpError(
      403,
      "No employee profile is linked to this user",
      "NO_EMPLOYEE"
    );
  }

  const year = nowTz().year;

  return prisma.leaveBalance.findMany({
    where: {
      employeeId,
      year
    },
    include: {
      leaveType: true
    },
    orderBy: {
      leaveType: {
        name: "asc"
      }
    }
  });
}



// https://dashboard.render.com/web/srv-dauadsm0tbcc73ek8h0g/environment