import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/errors.js";
import { catalogRouter } from "./routes/catalog.js";
import { importRouter } from "./routes/imports.js";
import { analyticsRouter } from "./routes/analytics.js";
import { exportRouter } from "./routes/export.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "global-development-warehouse" });
  });

  app.use("/api/catalog", catalogRouter);
  app.use("/api/imports", importRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/export", exportRouter);

  app.use(errorHandler);
  return app;
}
