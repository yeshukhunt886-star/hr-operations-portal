
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/errors.js";
import { optionalEmployeeIdFromSession } from "../middleware/auth.js";
import { parsePagination, paginated } from "../lib/pagination.js";
import * as attendance from "../services/attendanceService.js";
import * as leave from "../services/leaveService.js";
import { prisma } from "../prisma.js";
import { getPayslip } from "../services/payrollService.js";
import { nowTz, dateOnly } from "../lib/time.js";
export const meRouter = Router();

// ATTENDANCE - CHECK IN
meRouter.post(
  "/attendance/check-in",
  asyncHandler(async (req, res) => {
    optionalEmployeeIdFromSession(req);

    if (
      req.body?.employeeId &&
      req.body.employeeId !== req.user.employeeId
    ) {
      // Ignore client-supplied identity.
    }

    const session = await attendance.checkIn(req.user, {
      at: req.body?.at,
      idempotencyKey: req.get("Idempotency-Key")
    });

    res.status(201).json(session);
  })
);

// ATTENDANCE - BREAK IN
meRouter.post(
  "/attendance/break-in",
  asyncHandler(async (req, res) => {
    optionalEmployeeIdFromSession(req);

    const session = await attendance.breakIn(req.user, {
      at: req.body?.at
    });

    res.json(session);
  })
);

// ATTENDANCE - BREAK OUT
meRouter.post(
  "/attendance/break-out",
  asyncHandler(async (req, res) => {
    optionalEmployeeIdFromSession(req);

    const session = await attendance.breakOut(req.user, {
      at: req.body?.at
    });

    res.json(session);
  })
);

// ATTENDANCE - CHECK OUT
meRouter.post(
  "/attendance/check-out",
  asyncHandler(async (req, res) => {
    optionalEmployeeIdFromSession(req);

    const session = await attendance.checkOut(req.user, {
      at: req.body?.at,
      idempotencyKey: req.get("Idempotency-Key")
    });

    res.json(session);
  })
);

// ATTENDANCE - HISTORY
meRouter.get(
  "/attendance",
  asyncHandler(async (req, res) => {
    const employeeId =
      optionalEmployeeIdFromSession(req);

    const p = parsePagination(req.query);

    const from = req.query.from
      ? dateOnly(req.query.from).toISODate()
      : undefined;

    const to = req.query.to
      ? dateOnly(req.query.to).toISODate()
      : undefined;

    const { items, total } =
      await attendance.listAttendance(
        employeeId,
        {
          from,
          to,
          ...p
        }
      );

    res.json(
      paginated(
        items,
        total,
        p.page,
        p.pageSize
      )
    );
  })
);

// ATTENDANCE - SUMMARY
meRouter.get(
  "/attendance/summary",
  asyncHandler(async (req, res) => {
    const employeeId =
      optionalEmployeeIdFromSession(req);

    const from = req.query.from
      ? dateOnly(req.query.from).toISODate()
      : undefined;

    const to = req.query.to
      ? dateOnly(req.query.to).toISODate()
      : undefined;

    const summary =
      await attendance.getAttendanceSummary(
        employeeId,
        {
          from,
          to
        }
      );

    res.json(summary);
  })
);

// ATTENDANCE - OPEN SESSION
meRouter.get(
  "/attendance/open",
  asyncHandler(async (req, res) => {
    const employeeId =
      optionalEmployeeIdFromSession(req);

    const lock =
      await prisma.attendanceOpenLock.findUnique({
        where: {
          employeeId
        }
      });

    if (!lock) {
      return res.json({
        session: null
      });
    }

    const session =
      await prisma.attendanceSession.findUnique({
        where: {
          id: lock.sessionId
        }
      });

    res.json({
      session
    });
  })
);

// LEAVE - REQUEST
meRouter.post(
  "/leave",
  asyncHandler(async (req, res) => {
    optionalEmployeeIdFromSession(req);

    const body = z
      .object({
        leaveTypeId: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        reason: z.string().min(3).max(500)
      })
      .parse(req.body);

    const created =
      await leave.requestLeave(
        req.user,
        body
      );

    res.status(201).json(created);
  })
);

// LEAVE - LIST
meRouter.get(
  "/leave",
  asyncHandler(async (req, res) => {
    const p = parsePagination(req.query);

    const { items, total } =
      await leave.listLeaveForActor(
        req.user,
        {
          ...req.query,
          mine: "true"
        },
        p
      );

    res.json(
      paginated(
        items,
        total,
        p.page,
        p.pageSize
      )
    );
  })
);

// LEAVE - BALANCES
meRouter.get(
  "/leave/balances",
  asyncHandler(async (req, res) => {
    const employeeId =
      optionalEmployeeIdFromSession(req);

    res.json({
      items:
        await leave.getBalances(
          employeeId
        )
    });
  })
);

// LEAVE - CANCEL
meRouter.post(
  "/leave/:id/cancel",
  asyncHandler(async (req, res) => {
    const updated =
      await leave.transitionLeave(
        req.user,
        req.params.id,
        "CANCELLED",
        req.body?.note
      );

    res.json(updated);
  })
);

// PAYSLIP - SINGLE
meRouter.get(
  "/payslips/:year/:month",
  asyncHandler(async (req, res) => {
    const employeeId =
      optionalEmployeeIdFromSession(req);

    const item = await getPayslip(
      req.user,
      employeeId,
      req.params.year,
      req.params.month
    );

    if (!item) {
      return res.status(404).json({
        error: "Payslip not found",
        code: "NOT_FOUND"
      });
    }

    res.json(item);
  })
);

// PAYSLIPS - LIST
meRouter.get(
  "/payslips",
  asyncHandler(async (req, res) => {
    const employeeId =
      optionalEmployeeIdFromSession(req);

    const items =
      await prisma.payrollItem.findMany({
        where: {
          employeeId,
          status: "FINALIZED"
        },
        orderBy: [
          {
            year: "desc"
          },
          {
            month: "desc"
          }
        ],
        take: 24
      });

    res.json({
      items
    });
  })
);

// SERVER CLOCK
meRouter.get(
  "/clock",
  asyncHandler(async (_req, res) => {
    const n = nowTz();

    res.json({
      timezone: n.zoneName,
      now: n.toISO(),
      businessDate: n.toISODate()
    });
  })
);
