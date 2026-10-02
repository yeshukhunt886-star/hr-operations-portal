import multer from "multer";
import crypto from "node:crypto";
import path from "node:path";

import {
  TEMP_ROOT,
} from "../config/storage.js";

const MAX_FILE_SIZE = Number(
  process.env.MAX_FILE_SIZE || 10485760
);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".docx",
]);

const ALLOWED_CLIENT_MIME_TYPES =
  new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]);

function getExtension(filename) {
  if (
    typeof filename !== "string"
  ) {
    return "";
  }

  return path
    .extname(filename)
    .toLowerCase();
}

const storage = multer.diskStorage({
  destination: (
    req,
    file,
    cb
  ) => {
    cb(null, TEMP_ROOT);
  },

  filename: (
    req,
    file,
    cb
  ) => {
    const temporaryFilename =
      `${crypto.randomUUID()}.upload`;

    cb(
      null,
      temporaryFilename
    );
  },
});

function fileFilter(
  req,
  file,
  cb
) {
  const extension =
    getExtension(file.originalname);

  /*
   * The browser MIME type is only an
   * initial filter.
   *
   * The actual content is inspected later.
   */
  if (
    !ALLOWED_EXTENSIONS.has(
      extension
    )
  ) {
    return cb(
      new Error(
        "File extension is not allowed."
      )
    );
  }

  if (
    !ALLOWED_CLIENT_MIME_TYPES.has(
      file.mimetype
    )
  ) {
    return cb(
      new Error(
        "File content type is not allowed."
      )
    );
  }

  cb(null, true);
}

const uploadSingleDocument =
  multer({
    storage,
    fileFilter,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1,
      fields: 20,
      parts: 25,
    },
  }).single("document");

export {
  uploadSingleDocument,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  ALLOWED_CLIENT_MIME_TYPES,
};