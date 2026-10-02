
import { prisma } from "../prisma.js";
import { config } from "../config.js";
import { HttpError } from "../lib/errors.js";
import { writeAudit } from "../lib/audit.js";
import {
  nowTz,
  parseIsoInBusinessTz,
  businessDate,
  parseWorkStart,
  endOfBusinessDay,
  dateOnly,
  toTz,
  toDateColumn
} from "../lib/time.js";
import { chargeableDays } from "../lib/calendar.js";

// Calculate worked duration in minutes.
function durationMinutes(start, end) {
  const mins = Math.round(
    end.diff(start, "minutes").minutes
  );
  if (mins < 0) {
    throw new HttpError(
      400,
      "Checkout is earlier than check-in",
      "INVALID_RANGE"
    );
  }
  const cap = config.maxShiftHours * 60;
  return Math.min(mins, cap);
}

// Check whether employee has an approved full-day leave.
async function hasApprovedFullDayLeave(employeeId, day) {
  const js = toDateColumn(day);
  const leave =
    await prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: "APPROVED",
        startDate: { lte: js },
        endDate: { gte: js }
      }
    });
  if (!leave) {
    return false;
  }

  const charged = await chargeableDays(
    dateOnly(leave.startDate),
    dateOnly(leave.endDate)
  );
  return (
    charged > 0 &&
    Number(leave.daysCharged) > 0
  );
}

// Employee check-in.
export async function checkIn(
  actor,
  { at, idempotencyKey } = {}
) {
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
      "No employee profile",
      "NO_EMPLOYEE"
    );
  }

  const when = at
    ? parseIsoInBusinessTz(at)
    : nowTz();
  const day = when.startOf("day");
  const employee =
    await prisma.employee.findUnique({
      where: { id: employeeId }
    });
  if (!employee) {
    throw new HttpError(
      404,
      "Employee profile not found",
      "EMPLOYEE_NOT_FOUND"
    );
  }
  if (employee.status !== "ACTIVE") {
    throw new HttpError(
      403,
      "Employee is not active",
      "ACCOUNT_INACTIVE"
    );
  }
  if (await hasApprovedFullDayLeave(employeeId,day)) {
    throw new HttpError(
      409,
      "Cannot check in on an approved full-day leave",
      "LEAVE_CONFLICT"
    );
  }

  const expected = parseWorkStart( employee.workStart, day);
  const grace = expected.plus({ minutes: config.lateGraceMinutes});
  const lateMinutes =
    when > grace
      ? Math.round(
          when.diff(
            expected,
            "minutes"
          ).minutes
        )
      : 0;

  try {
    return await prisma.$transaction(
      async (tx) => {
        // MySQL/MariaDB: use Prisma instead of
        // PostgreSQL-specific raw SQL.
        const lockedEmployee =
          await tx.employee.findUnique({
            where: {
              id: employeeId
            },
            select: {
              id: true,
              status: true
            }
          });

        if (!lockedEmployee) {
          throw new HttpError(
            404,
            "Employee profile not found",
            "EMPLOYEE_NOT_FOUND"
          );
        }

        if ( lockedEmployee.status !== "ACTIVE") {
          throw new HttpError(
            403,
            "Employee is not active",
            "ACCOUNT_INACTIVE"
          );
        }

        /*
          DAILY SESSION LIMIT
          Only 1 completed attendance session
          is allowed per business day.
          Session 1:
          Check-in -> Check-out = CLOSED
          After that:
          Check-in #2 = BLOCKED
        */
        const completedSessionCount =
          await tx.attendanceSession.count({
            where: {
              employeeId,
              businessDate:
                businessDate(when),
              status: "CLOSED"
            }
          });

        if (completedSessionCount >= 1) {
          throw new HttpError(
            409,
            "Only 1 attendance session is allowed per day.",
            "DAILY_SESSION_LIMIT"
          );
        }

        // Check whether an open attendance
        // session already exists.
        const existingLock =
          await tx.attendanceOpenLock.findUnique(
            {
              where: {employeeId}
            }
          );

        if (existingLock) {
          throw new HttpError(
            409,
            "An open attendance session already exists",
            "OPEN_SESSION"
          );
        }

        // Create attendance session.
        const session =
          await tx.attendanceSession.create({
            data: {
              employeeId,
              businessDate:
                businessDate(when),
              checkInAt:
                when.toUTC().toJSDate(),
              lateMinutes,
              status: "OPEN"
            }
          });

        // Create open-session lock.
        await tx.attendanceOpenLock.create({
          data: {
            employeeId,
            sessionId: session.id
          }
        });

        // Write audit log.
        await writeAudit(tx, {
          actorUserId: actor.id,
          action:
            "ATTENDANCE_CHECK_IN",
          entityType:
            "AttendanceSession",
          entityId: session.id,
          metadata: {
            businessDate:
              day.toISODate(),
            lateMinutes,
            idempotencyKey
          }
        });
        return session;
      }
    );
  } catch (err) {
    // Unique constraint means another
    // open session was created.
    if (err?.code === "P2002") {
      throw new HttpError(
        409,
        "An open attendance session already exists",
        "OPEN_SESSION"
      );
    }
    throw err;
  }
}

// Employee break-in.
export async function breakIn(
  actor,
  { at } = {}
) {
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
      "No employee profile",
      "NO_EMPLOYEE"
    );
  }

  const when = at
    ? parseIsoInBusinessTz(at)
    : nowTz();

  return prisma.$transaction(
    async (tx) => {
      const lock =
        await tx.attendanceOpenLock.findUnique(
          {
            where: { employeeId}
          }
        );

      if (!lock) {
        throw new HttpError(
          409,
          "No open check-in to start a break",
          "NO_OPEN_SESSION"
        );
      }
      const session =
        await tx.attendanceSession.findUnique(
          {
            where: { id: lock.sessionId}
          }
        );

      if ( !session || session.status !== "OPEN") {
        throw new HttpError(
          409,
          "No open check-in to start a break",
          "NO_OPEN_SESSION"
        );
      }

      const checkIn =
        toTz(session.checkInAt);

      if ( when.toUTC() < checkIn.toUTC() ) {
        throw new HttpError(
          400,
          "Break in is earlier than check-in",
          "INVALID_RANGE"
        );
      }

      if (session.breakInAt) {
        throw new HttpError(
          409,
          "Break is already started",
          "BREAK_ALREADY_OPEN"
        );
      }

      const updated =
        await tx.attendanceSession.update(
          {
            where: { id: session.id },
            data: {
              breakInAt:
                when.toUTC().toJSDate()
            }
          }
        );

      await writeAudit(tx, {
        actorUserId: actor.id,
        action:
          "ATTENDANCE_BREAK_IN",
        entityType:
          "AttendanceSession",
        entityId: session.id,
        metadata: {
          breakInAt:
            when.toISO(),
          allowedBreakMinutes:
            config.breakMinutes
        }
      });
      return updated;
    }
  );
}

// Employee break-out.
export async function breakOut(
  actor,
  { at } = {}
) {
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
      "No employee profile",
      "NO_EMPLOYEE"
    );
  }

  const when = at
    ? parseIsoInBusinessTz(at)
    : nowTz();

  return prisma.$transaction(
    async (tx) => {
      const lock =
        await tx.attendanceOpenLock.findUnique(
          {
            where: {
              employeeId
            }
          }
        );

      if (!lock) {
        throw new HttpError(
          409,
          "No open check-in for break-out",
          "NO_OPEN_SESSION"
        );
      }

      const session =
        await tx.attendanceSession.findUnique(
          {
            where: {
              id: lock.sessionId
            }
          }
        );

      if ( !session || session.status !== "OPEN") {
        throw new HttpError(
          409,
          "No open check-in for break-out",
          "NO_OPEN_SESSION"
        );
      }

      if (!session.breakInAt) {
        throw new HttpError(
          409,
          "Break in must be recorded first",
          "NO_BREAK_IN"
        );
      }

      if (session.breakOutAt) {
        throw new HttpError(
          409,
          "Break is already closed",
          "BREAK_ALREADY_CLOSED"
        );
      }

      const breakIn =
        toTz(session.breakInAt);

      if (when.toUTC() <breakIn.toUTC()) {
        throw new HttpError(
          400,
          "Break out is earlier than break in",
          "INVALID_RANGE"
        );
      }

      const breakDuration =
        Math.max(
          0,
          Math.round(
            when.diff( breakIn,"minutes").minutes
          )
        );

      const updated =
        await tx.attendanceSession.update(
          {
            where: {
              id: session.id
            },
            data: {
              breakOutAt: when.toUTC().toJSDate(),
              breakDurationMinutes: breakDuration
            }
          }
        );

      await writeAudit(tx, {
        actorUserId: actor.id,
        action: "ATTENDANCE_BREAK_OUT",
        entityType: "AttendanceSession",
        entityId: session.id,
        metadata: {
          breakDurationMinutes: breakDuration,
          allowedBreakMinutes: config.breakMinutes,
          exceededAllowedBreak: breakDuration > config.breakMinutes
        }
      });
      return updated;
    }
  );
}

// Employee check-out.
export async function checkOut(
  actor,
  { at, idempotencyKey } = {}
) {
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
      "No employee profile",
      "NO_EMPLOYEE"
    );
  }

  const whenRequested = at
    ? parseIsoInBusinessTz(at)
    : nowTz();

  return prisma.$transaction(
    async (tx) => {
      // Find employee.
      const employee =
        await tx.employee.findUnique({
          where: {
            id: employeeId
          },
          select: {
            id: true,
            status: true
          }
        });

      if (!employee) {
        throw new HttpError(
          404,
          "Employee profile not found",
          "EMPLOYEE_NOT_FOUND"
        );
      }

      if (employee.status !== "ACTIVE") {
        throw new HttpError(
          403,
          "Employee is not active",
          "ACCOUNT_INACTIVE"
        );
      }

      // Find the employee's open
      // attendance lock.
      const lock =
        await tx.attendanceOpenLock.findUnique(
          {
            where: {
              employeeId
            }
          }
        );

      if (!lock) {
        // Check idempotency key in case
        // checkout already happened.
        if (idempotencyKey) {
          const prior =
            await tx.attendanceSession.findFirst(
              {
                where: {
                  employeeId,
                  checkoutIdempotencyKey:
                    idempotencyKey
                }
              }
            );

          if (prior) {
            return prior;
          }
        }

        throw new HttpError(
          409,
          "No open check-in to close",
          "NO_OPEN_SESSION"
        );
      }

      // Get the actual attendance session.
      const session =
        await tx.attendanceSession.findUnique(
          {
            where: {
              id: lock.sessionId
            }
          }
        );

      if ( !session || session.status !== "OPEN") {
        throw new HttpError(
          409,
          "No open check-in to close",
          "NO_OPEN_SESSION"
        );
      }

      // Idempotent checkout.
      if (idempotencyKey &&session.checkoutIdempotencyKey ===idempotencyKey) {
        return session;
      }

      // Employee cannot checkout while
      // a break is still running.
      if ( session.breakInAt && !session.breakOutAt) {
        throw new HttpError(
          409,
          "Break out before checking out",
          "BREAK_OPEN"
        );
      }

      const checkIn = toTz(session.checkInAt);
      let checkOut = whenRequested;
      const dayEnd =
        endOfBusinessDay(
          checkIn.startOf("day")
        );

      // Checkout cannot be earlier
      // than check-in.
      if ( checkOut.toUTC() < checkIn.toUTC()) {
        throw new HttpError(
          400,
          "Checkout is earlier than check-in",
          "INVALID_RANGE"
        );
      }

      // If checkout goes to the next
      // business day, close it at the
      // configured business-day boundary.
      if ( checkOut.startOf("day") >  checkIn.startOf("day")) {
        checkOut = dayEnd;
      }

      // Calculate total elapsed duration.
      const duration =
        durationMinutes( checkIn, checkOut);

      // Break time is not counted as
      // working time.
      const breakDuration =
        Number( session.breakDurationMinutes) || 0;

      // Actual working time.
      const worked =
        Math.max( 0, duration - breakDuration );

      // Required working time.
      const requiredWorkMinutes =
        config.workHours * 60;

      // Employee must complete the
      // required working hours before
      // checkout.
      if ( worked < requiredWorkMinutes) {
        const remainingMinutes = requiredWorkMinutes - worked;

        throw new HttpError(
          403,
          `Checkout not available yet. You have ${remainingMinutes} minutes remaining to complete ${config.workHours} working hours.`,
          "WORK_HOURS_NOT_COMPLETED"
        );
      }

      // Save completed attendance.
      const updated =
        await tx.attendanceSession.update(
          {
            where: {id: session.id },
            data: {
              checkOutAt: checkOut.toUTC().toJSDate(),
              durationMinutes: duration,
              workedMinutes: worked,
              status: "CLOSED",
              checkoutIdempotencyKey:idempotencyKey ||`auto-${session.id}`
            }
          }
        );

      // Remove open-session lock.
      await tx.attendanceOpenLock
        .delete({
          where: {
            employeeId
          }
        })
        .catch(() => {});

      // Write audit log.
      await writeAudit(tx, {
        actorUserId: actor.id,
        action: "ATTENDANCE_CHECK_OUT",
        entityType: "AttendanceSession",
        entityId: session.id,
        metadata: {
          durationMinutes:duration,
          breakDurationMinutes: breakDuration,
          workedMinutes: worked,
          targetWorkMinutes: requiredWorkMinutes,
          closedAtDayBoundary: checkOut.toISO() === dayEnd.toISO()
        }
      });
      return updated;
    }
  );
}

// Auto check-out an employee's open attendance session.
export async function autoCheckOut(
  employeeId,
  { at } = {}
) {
  if (!employeeId) {
    throw new HttpError(
      400,
      "Employee ID is required",
      "EMPLOYEE_ID_REQUIRED"
    );
  }

  const when = at
    ? parseIsoInBusinessTz(at)
    : nowTz();

  return prisma.$transaction(
    async (tx) => {
      // Find the employee's open attendance lock.
      const lock =
        await tx.attendanceOpenLock.findUnique({
          where: {
            employeeId
          }
        });

      // Nothing to auto-close.
      if (!lock) {
        return null;
      }

      // Find the open attendance session.
      const session =
        await tx.attendanceSession.findUnique({
          where: {
            id: lock.sessionId
          }
        });

      if ( !session || session.status !== "OPEN") {
        await tx.attendanceOpenLock
          .delete({
            where: {
              employeeId
            }
          })
          .catch(() => {});
        return null;
      }

      const checkIn = toTz(session.checkInAt);

      /*
        Auto checkout happens at the end of
        the employee's business day.
        If the supplied time is still before
        the business-day boundary, do nothing.
      */
      const dayEnd =
        endOfBusinessDay(
          checkIn.startOf("day")
        );

      if (when.toUTC() <dayEnd.toUTC()) {
        return null;
      }
      const checkOut =dayEnd;

      // Calculate total elapsed duration.
      const duration =
        durationMinutes(checkIn,checkOut);

      // Break time is not counted as
      // working time.
      const breakDuration = Number( session.breakDurationMinutes) || 0;

      // Actual working time.
      const worked =
        Math.max( 0, duration - breakDuration);

      // Save auto-closed attendance.
      const updated =
        await tx.attendanceSession.update({
          where: { id: session.id},
          data: {
            checkOutAt:checkOut.toUTC().toJSDate(),
            durationMinutes: duration,
            workedMinutes: worked,
            status: "CLOSED",
            checkoutIdempotencyKey:`auto-${session.id}`
          }
        });

      // Remove open-session lock.
      await tx.attendanceOpenLock
        .delete({
          where: {
            employeeId
          }
        })
        .catch(() => {});

      // Write audit log.
      await writeAudit(tx, {
        actorUserId: null,
        action: "ATTENDANCE_AUTO_CHECK_OUT",
        entityType: "AttendanceSession",
        entityId: session.id,
        metadata: {
          checkInAt:checkIn.toISO(),
          checkOutAt: checkOut.toISO(),
          durationMinutes: duration,
          breakDurationMinutes: breakDuration,
          workedMinutes: worked,
          reason: "Employee did not check out manually before business day ended"
        }
      });
      return updated;
    }
  );
}

// List attendance history.
export async function listAttendance(
  employeeId,
  { from, to, skip, take }
) {
  if (!employeeId) {
    throw new HttpError(
      403,
      "No employee profile",
      "NO_EMPLOYEE"
    );
  }

  const where = { employeeId };
  if (from || to) {
    where.businessDate = {};
    if (from) {
      where.businessDate.gte =
        toDateColumn(
          dateOnly(from)
        );
    }
    if (to) {
      where.businessDate.lte =
        toDateColumn(
          dateOnly(to)
        );
    }
  }

  const [items, total] =
    await Promise.all([
      prisma.attendanceSession.findMany({
        where,
        orderBy: {
          checkInAt: "desc"
        },
        skip,
        take
      }),
      prisma.attendanceSession.count({
        where
      })
    ]);

  return {items,total};
}

// Get attendance summary for an employee.
export async function getAttendanceSummary(
  employeeId,
  { from, to } = {}
) {
  if (!employeeId) {
    throw new HttpError(
      403,
      "No employee profile",
      "NO_EMPLOYEE"
    );
  }

  const today = nowTz().startOf("day");

  const fromDate = from
    ? dateOnly(from)
    : today.minus({ days: 30 });

  const toDate = to
    ? dateOnly(to)
    : today;

  if (fromDate > toDate) {
    throw new HttpError(
      400,
      "From date cannot be after to date",
      "INVALID_DATE_RANGE"
    );
  }

  const sessions =
    await prisma.attendanceSession.findMany({
      where: {
        employeeId,
        businessDate: {
          gte: toDateColumn(fromDate),
          lte: toDateColumn(toDate)
        }
      },
      orderBy: {
        businessDate: "asc"
      }
    });

  // Only one attendance session is allowed per day.
  const presentDays = sessions.filter(
    (session) =>
      session.status === "CLOSED"
  ).length;

  const lateDays = sessions.filter(
    (session) =>
      Number(session.lateMinutes) > 0
  ).length;

  const totalWorkedMinutes =
    sessions.reduce(
      (total, session) =>
        total +
        (Number(session.workedMinutes) || 0),
      0
    );

  const totalBreakMinutes =
    sessions.reduce(
      (total, session) =>
        total +
        (Number(session.breakDurationMinutes) || 0),
      0
    );

  const totalWorkingMinutes =
    sessions.reduce(
      (total, session) =>
        total +
        (Number(session.durationMinutes) || 0),
      0
    );

  const averageWorkedMinutes =
    presentDays > 0
      ? Math.round(totalWorkedMinutes / presentDays )
      : 0;

  // Calculate chargeable working days.
  const workingDays = await chargeableDays( fromDate, toDate);
  const absentDays = Math.max( 0,workingDays - presentDays );
  const attendancePercentage =
    workingDays > 0
      ? Number(( (presentDays / workingDays) *  100 ).toFixed(2))
      : 0;

  return {
    from: fromDate.toISODate(),
    to: toDate.toISODate(),

    totalWorkingDays: workingDays,
    presentDays,
    absentDays,
    lateDays,

    attendancePercentage,

    totalWorkedMinutes,
    totalBreakMinutes,
    totalWorkingMinutes,
    averageWorkedMinutes,

    requiredDailyWorkMinutes:
      config.workHours * 60,

    sessionsCount: sessions.length
  };
}