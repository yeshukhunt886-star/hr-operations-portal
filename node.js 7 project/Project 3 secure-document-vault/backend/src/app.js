import express from "express";
import cors from "cors";
import helmet from "helmet";

import db from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import storageRoutes from "./routes/storageRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import documentShareRoutes from "./routes/documentShareRoutes.js";
import shareLinkRoutes from "./routes/shareLinkRoutes.js";

import {
  getStorageInfo,
} from "./services/storageService.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);


app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Secure Document Vault API is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/db", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT 1 AS database_ok"
    );

    return res.status(200).json({
      success: true,
      message: "Database connection successful",
      database: rows[0],
    });
  } catch (error) {
    console.error(
      "Database health check failed:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

app.get(
  "/api/health/storage",
  async (req, res) => {
    try {
      const storage = await getStorageInfo();

      return res.status(200).json({
        success: true,
        message: "Secure storage is available.",
        storage,
      });
    } catch (error) {
      console.error(
        "Storage health check failed:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message: "Storage is unavailable.",
      });
    }
  }
);

// ==========================================
// ROUTES
// ==========================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/storage",
  storageRoutes
);

app.use(
  "/api/documents",
  documentRoutes
);

app.use(
  "/api/documents",
  documentShareRoutes
);

app.use(
  "/api",
  shareLinkRoutes
);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(
  (err, req, res, next) => {
    console.error(
      "Global error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
);

export default app;