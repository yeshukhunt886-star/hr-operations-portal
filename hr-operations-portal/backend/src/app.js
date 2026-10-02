import express from "express";

import cors from "cors";

import { ZodError } from "zod";

import { config } from "./config.js";

import { errorHandler, HttpError } from "./lib/errors.js";

import { authRequired } from "./middleware/auth.js";

import { authRouter } from "./routes/auth.js";

import { meRouter } from "./routes/me.js";

import { employeeRouter, orgRouter } from "./routes/employees.js";

import { leaveRouter, holidayRouter } from "./routes/leave.js";

import { payrollRouter, reportRouter, auditRouter } from "./routes/payroll.js";

import { notificationRouter } from "./routes/notifications.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin, credentials: true }));

  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      tz: config.businessTz,
    });
  });

  app.use("/api/auth", authRouter);

  app.use("/api/me", authRequired, meRouter);

  app.use("/api/employees", authRequired, employeeRouter);

  app.use("/api/org", authRequired, orgRouter);

  app.use("/api/leave", authRequired, leaveRouter);

  app.use("/api/holidays", authRequired, holidayRouter);

  app.use("/api/payroll", authRequired, payrollRouter);

  app.use("/api/reports", authRequired, reportRouter);

  app.use("/api/audit", authRequired, auditRouter);

  // Notifications
  app.use("/api/notifications", authRequired, notificationRouter);

  app.use((err, req, res, next) => {
    if (err instanceof ZodError) {
      return next(
        new HttpError(
          400,
          err.errors[0]?.message || "Invalid input",
          "VALIDATION"
        )
      );
    }

    next(err);
  });

  app.use(errorHandler);

  return app;
}