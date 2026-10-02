import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(
  __dirname,
  "../.."
);

const configuredStoragePath =
  process.env.STORAGE_PATH || "./storage";

const STORAGE_ROOT = path.resolve(
  PROJECT_ROOT,
  configuredStoragePath
);

const DOCUMENTS_ROOT = path.join(
  STORAGE_ROOT,
  "documents"
);

const TEMP_ROOT = path.join(
  STORAGE_ROOT,
  "temp"
);

export {
  PROJECT_ROOT,
  STORAGE_ROOT,
  DOCUMENTS_ROOT,
  TEMP_ROOT,
};