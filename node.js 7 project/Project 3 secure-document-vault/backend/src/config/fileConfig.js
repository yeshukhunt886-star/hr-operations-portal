const path = require("node:path");

const MAX_FILE_SIZE = Number(
  process.env.MAX_FILE_SIZE || 10 * 1024 * 1024
);

const ALLOWED_FILE_TYPES = {
  ".pdf": {
    mimeTypes: [
      "application/pdf",
    ],
  },

  ".jpg": {
    mimeTypes: [
      "image/jpeg",
    ],
  },

  ".jpeg": {
    mimeTypes: [
      "image/jpeg",
    ],
  },

  ".png": {
    mimeTypes: [
      "image/png",
    ],
  },

  ".txt": {
    mimeTypes: [
      "text/plain",
    ],
  },

  ".doc": {
    mimeTypes: [
      "application/msword",
    ],
  },

  ".docx": {
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },

  ".xls": {
    mimeTypes: [
      "application/vnd.ms-excel",
    ],
  },

  ".xlsx": {
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  },
};

function normalizeExtension(filename) {
  return path
    .extname(filename || "")
    .toLowerCase();
}

function isAllowedExtension(extension) {
  return Object.prototype.hasOwnProperty.call(
    ALLOWED_FILE_TYPES,
    extension
  );
}

function isAllowedMimeType(extension, mimeType) {
  const config =
    ALLOWED_FILE_TYPES[extension];

  if (!config) {
    return false;
  }

  return config.mimeTypes.includes(
    String(mimeType || "").toLowerCase()
  );
}

module.exports = {
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  normalizeExtension,
  isAllowedExtension,
  isAllowedMimeType,
};