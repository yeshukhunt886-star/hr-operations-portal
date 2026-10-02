import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(root, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  jwtExpiresIn: "12h",
  businessTz: process.env.BUSINESS_TZ || "Asia/Kolkata",
  workStart: process.env.WORK_START || "09:00",
  lateGraceMinutes: Number(process.env.LATE_GRACE_MINUTES || 15),
  workHours: Number(process.env.WORK_HOURS || 6),
  breakMinutes: Number(process.env.BREAK_MINUTES || 45),
  maxShiftHours: Number(process.env.MAX_SHIFT_HOURS || 16),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  pageSizeDefault: 20,
  pageSizeMax: 100
};
