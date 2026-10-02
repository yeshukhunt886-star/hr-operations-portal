import fs from "fs/promises";

import {
  getStorageDirectories,
} from "../services/storageService.js";

// ==========================================
// STORAGE HEALTH
// ==========================================

async function getStorageHealth(req, res) {
  try {
    const directories =
      getStorageDirectories();

    // Check storage directories
    await fs.access(directories.storageRoot);
    await fs.access(directories.documents);
    await fs.access(directories.temp);

    return res.status(200).json({
      success: true,
      message: "Secure storage is available.",
      storage: {
        initialized: true,
        documents: true,
        temp: true,
      },
    });
  } catch (error) {
    console.error(
      "Storage health check failed:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Secure storage is unavailable.",
    });
  }
}

// ==========================================
// EXPORT
// ==========================================

export {
  getStorageHealth,
};