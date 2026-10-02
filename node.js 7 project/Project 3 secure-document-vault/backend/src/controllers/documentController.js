import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import db from "../config/db.js";

import {
  createDocumentStorageKey,
  moveFile,
  deleteFile,
  cleanupTempFile,
} from "../services/storageService.js";

import {
  ALLOWED_EXTENSIONS,
} from "../middleware/uploadMiddleware.js";

import {
  getDocuments,
  getDocumentById,
  updateDocumentMetadata,
  softDeleteDocument,
  restoreDocument,
  getDownloadableDocument,
  createAuditLog,
} from "../services/documentService.js";

// ==========================================
// NORMALIZE ORIGINAL FILENAME
// ==========================================

function normalizeOriginalFilename(filename) {
  if (typeof filename !== "string") {
    return "unnamed-document";
  }

  let normalized = filename.normalize("NFC");

  // Remove null/control characters
  normalized = normalized.replace(
    /[\u0000-\u001F\u007F]/g,
    ""
  );

  // Prevent path traversal / separators
  normalized = normalized.replace(
    /[\\/]/g,
    "_"
  );

  // Remove leading/trailing whitespace
  normalized = normalized.trim();

  // Prevent special path values
  if (
    !normalized ||
    normalized === "." ||
    normalized === ".."
  ) {
    normalized = "unnamed-document";
  }

  // Limit metadata filename
  if (normalized.length > 255) {
    normalized = normalized.slice(0, 255);
  }

  return normalized;
}

// ==========================================
// SAFE EXTENSION
// ==========================================

function getSafeExtension(filename) {
  const extension = path
    .extname(filename)
    .toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return null;
  }

  return extension;
}

// ==========================================
// SHA-256
// ==========================================

function calculateSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");

    const stream = fs.createReadStream(
      filePath
    );

    stream.on("data", (chunk) => {
      hash.update(chunk);
    });

    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });

    stream.on("error", reject);
  });
}

// ==========================================
// FILE CONTENT INSPECTION
// ==========================================

async function inspectFileContent(
  filePath,
  extension
) {
  const {
    fileTypeFromFile,
  } = await import("file-type");

  const detected =
    await fileTypeFromFile(filePath);

  console.log(
    "Detected file type:",
    detected
  );

  // ========================================
  // PDF
  // ========================================

  if (extension === ".pdf") {
    if (
      !detected ||
      detected.mime !== "application/pdf"
    ) {
      return {
        valid: false,
        reason:
          "File content does not match PDF format.",
      };
    }

    return {
      valid: true,
      detectedMime:
        "application/pdf",
    };
  }

  // ========================================
  // JPEG
  // ========================================

  if (
    extension === ".jpg" ||
    extension === ".jpeg"
  ) {
    if (
      !detected ||
      detected.mime !== "image/jpeg"
    ) {
      return {
        valid: false,
        reason:
          "File content does not match JPEG format.",
      };
    }

    return {
      valid: true,
      detectedMime: "image/jpeg",
    };
  }

  // ========================================
  // PNG
  // ========================================

  if (extension === ".png") {
    if (
      !detected ||
      detected.mime !== "image/png"
    ) {
      return {
        valid: false,
        reason:
          "File content does not match PNG format.",
      };
    }

    return {
      valid: true,
      detectedMime: "image/png",
    };
  }

  // ========================================
  // WEBP
  // ========================================

  if (extension === ".webp") {
    if (
      !detected ||
      detected.mime !== "image/webp"
    ) {
      return {
        valid: false,
        reason:
          "File content does not match WEBP format.",
      };
    }

    return {
      valid: true,
      detectedMime: "image/webp",
    };
  }

  // ========================================
  // DOCX
  // ========================================

  if (extension === ".docx") {
    if (
      !detected ||
      ![
        "application/zip",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(detected.mime)
    ) {
      return {
        valid: false,
        reason:
          "File content does not match DOCX format.",
      };
    }

    return {
      valid: true,
      detectedMime:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }

  // ========================================
  // UNSUPPORTED
  // ========================================

  return {
    valid: false,
    reason:
      "Unsupported file format.",
  };
}

// ==========================================
// UPLOAD DOCUMENT
// ==========================================

export async function uploadDocument(
  req,
  res
) {
  let tempFilePath = null;
  let storageKey = null;

  try {
    // ========================================
    // FILE REQUIRED
    // ========================================

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "A document file is required.",
      });
    }

    tempFilePath = req.file.path;

    // ========================================
    // ORIGINAL FILENAME
    // ========================================

    const originalFilename =
      normalizeOriginalFilename(
        req.file.originalname
      );

    // ========================================
    // EXTENSION
    // ========================================

    const extension =
      getSafeExtension(
        originalFilename
      );

    if (!extension) {
      await cleanupTempFile(
        tempFilePath
      );

      tempFilePath = null;

      return res.status(400).json({
        success: false,
        message:
          "File extension is not allowed.",
      });
    }

    // ========================================
    // FILE SIZE
    // ========================================

    const fileStats =
      await fs.promises.stat(
        tempFilePath
      );

    if (fileStats.size <= 0) {
      await cleanupTempFile(
        tempFilePath
      );

      tempFilePath = null;

      return res.status(400).json({
        success: false,
        message:
          "Zero-byte files are not allowed.",
      });
    }

    // ========================================
    // FILE CONTENT VALIDATION
    // ========================================

    const inspection =
      await inspectFileContent(
        tempFilePath,
        extension
      );

    if (!inspection.valid) {
      await cleanupTempFile(
        tempFilePath
      );

      tempFilePath = null;

      return res.status(400).json({
        success: false,
        message:
          inspection.reason ||
          "File content does not match the allowed file type.",
      });
    }

    // ========================================
    // SHA-256
    // ========================================

    const fileHash =
      await calculateSha256(
        tempFilePath
      );

    // ========================================
    // SERVER CONTROLLED STORAGE KEY
    // ========================================

    storageKey =
      createDocumentStorageKey();

    // ========================================
    // MOVE INTO PRIVATE STORAGE
    // ========================================

    await moveFile(
      tempFilePath,
      storageKey
    );

    tempFilePath = null;

    // ========================================
    // DATABASE CONNECTION
    // ========================================

    const connection =
      await db.getConnection();

    try {
      await connection.beginTransaction();

      // ======================================
      // INSERT DOCUMENT
      // ======================================

      const [result] =
        await connection.execute(
          `
          INSERT INTO documents (
            owner_id,
            original_filename,
            stored_filename,
            storage_key,
            mime_type,
            file_size,
            file_hash,
            category,
            description,
            status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
          `,
          [
            req.user.userId,

            originalFilename,

            path.basename(
              storageKey
            ),

            storageKey,

            inspection.detectedMime,

            fileStats.size,

            fileHash,

            req.body.category
              ? String(
                  req.body.category
                )
                  .trim()
                  .slice(0, 100)
              : null,

            req.body.description
              ? String(
                  req.body.description
                )
                  .trim()
                  .slice(0, 500)
              : null,
          ]
        );

      const documentId =
        result.insertId;

      // ======================================
      // AUDIT LOG
      // ======================================

      await createAuditLog(
        connection,
        {
          userId:
            req.user.userId,

          documentId,

          action: "UPLOAD",

          success: true,

          ipAddress:
            req.ip || null,

          userAgent:
            req.get(
              "user-agent"
            ) || null,

          metadata: {
            fileSize:
              fileStats.size,

            mimeType:
              inspection.detectedMime,

            extension,
          },
        }
      );

      // ======================================
      // COMMIT
      // ======================================

      await connection.commit();

      // ======================================
      // RESPONSE
      // ======================================

      return res.status(201).json({
        success: true,

        message:
          "Document uploaded successfully.",

        document: {
          id: documentId,

          originalFilename,

          mimeType:
            inspection.detectedMime,

          fileSize:
            fileStats.size,

          category:
            req.body.category
              ? String(
                  req.body.category
                )
                  .trim()
                  .slice(0, 100)
              : null,

          description:
            req.body.description
              ? String(
                  req.body.description
                )
                  .trim()
                  .slice(0, 500)
              : null,

          status: "active",

          createdAt:
            new Date().toISOString(),
        },
      });
    } catch (dbError) {
      await connection.rollback();

      // REMOVE PHYSICAL FILE IF DB FAILS
      try {
        await deleteFile(
          storageKey
        );

        storageKey = null;
      } catch (cleanupError) {
        console.error(
          "Failed to clean stored file after DB failure:",
          cleanupError.message
        );
      }
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(
      "Document upload error:",
      error.message
    );

    // TEMP FILE CLEANUP
    if (tempFilePath) {
      try {
        await cleanupTempFile(
          tempFilePath
        );
      } catch (cleanupError) {
        console.error(
          "Temporary file cleanup failed:",
          cleanupError.message
        );
      }
    }

    // STORAGE FILE CLEANUP
    if (storageKey) {
      try {
        await deleteFile(
          storageKey
        );
      } catch (cleanupError) {
        console.error(
          "Stored file cleanup failed:",
          cleanupError.message
        );
      }
    }

    return res.status(500).json({
      success: false,
      message:
        "Document upload failed.",
    });
  }
}

// GET DOCUMENTS
// GET /api/documents
export async function listDocuments(
  req,
  res
) {
  try {
    const {
      search,
      category,
      status,
      sortBy = "created_at",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    const result =
      await getDocuments({
        userId:
          req.user.userId,
        search,
        category,
        status,
        sortBy,
        sortOrder,
        page,
        limit,
      });

    return res.status(200).json({
      success: true,

      message:
        "Documents fetched successfully.",

      ...result,
    });
  } catch (error) {
    console.error(
      "List documents error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch documents.",
    });
  }
}

// GET DOCUMENT
// GET /api/documents/:id
export async function getDocument(
  req,
  res
) {
  try {
    const documentId =
      Number(req.params.id);

    if (
      !Number.isSafeInteger(
        documentId
      ) ||
      documentId <= 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Document not found.",
      });
    }

    const document =
      await getDocumentById({
        documentId,

        userId:
          req.user.userId,
      });

    if (!document) {
      return res.status(404).json({
        success: false,
        message:
          "Document not found.",
      });
    }

    return res.status(200).json({
      success: true,

      document: {
        id: document.id,

        originalFilename:
          document.original_filename,

        mimeType:
          document.mime_type,

        fileSize:
          document.file_size,

        fileHash:
          document.file_hash,

        category:
          document.category,

        description:
          document.description,

        status:
          document.status,

        createdAt:
          document.created_at,

        updatedAt:
          document.updated_at,
      },
    });
  } catch (error) {
    console.error(
      "Get document error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch document.",
    });
  }
}

// UPDATE DOCUMENT
// PATCH /api/documents/:id

export async function updateDocument(
  req,
  res
) {
  try {
    const documentId =
      Number(req.params.id);

    if (
      !Number.isSafeInteger(
        documentId
      ) ||
      documentId <= 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Document not found.",
      });
    }

    const {
      category,
      description,
    } = req.body;

    // VALIDATE CATEGORY
    if (
      category !== undefined &&
      category !== null &&
      typeof category !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Category must be a string.",
      });
    }

    // VALIDATE DESCRIPTION
    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Description must be a string.",
      });
    }

    if (
      category !== undefined &&
      category !== null &&
      category.length > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Category cannot exceed 100 characters.",
      });
    }

    if (
      description !== undefined &&
      description !== null &&
      description.length > 500
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Description cannot exceed 500 characters.",
      });
    }

    const document =
      await updateDocumentMetadata({
        documentId,

        userId:
          req.user.userId,

        category,

        description,
      });

    if (!document) {
      return res.status(404).json({
        success: false,
        message:
          "Document not found.",
      });
    }

    return res.status(200).json({
      success: true,

      message:
        "Document metadata updated successfully.",

      document: {
        id: document.id,

        originalFilename:
          document.original_filename,

        mimeType:
          document.mime_type,

        fileSize:
          document.file_size,

        category:
          document.category,

        description:
          document.description,

        status:
          document.status,

        updatedAt:
          document.updated_at,
      },
    });
  } catch (error) {
    console.error(
      "Update document error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update document.",
    });
  }
}

// DELETE DOCUMENT
// DELETE /api/documents/:id
export async function deleteDocument(
  req,
  res
) {
  try {
    const documentId =
      Number(req.params.id);

    if (
      !Number.isSafeInteger(
        documentId
      ) ||
      documentId <= 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Document not found.",
      });
    }

    const result =
      await softDeleteDocument({
        documentId,

        userId:
          req.user.userId,
      });

    if (!result.found) {
      return res.status(404).json({
        success: false,
        message:
          "Document not found.",
      });
    }

    if (result.alreadyDeleted) {
      return res.status(409).json({
        success: false,
        message:
          "Document is already deleted.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Document deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete document error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete document.",
    });
  }
}

// RESTORE DOCUMENT
// POST /api/documents/:id/restore
export async function restoreDocumentController(
  req,
  res
) {
  try {
    const documentId =
      Number(req.params.id);

    if (
      !Number.isSafeInteger(
        documentId
      ) ||
      documentId <= 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Document not found.",
      });
    }

    const result =
      await restoreDocument({
        documentId,

        userId:
          req.user.userId,
      });

    if (!result.found) {
      return res.status(404).json({
        success: false,
        message:
          "Document not found.",
      });
    }

    if (result.alreadyActive) {
      return res.status(409).json({
        success: false,
        message:
          "Document is already active.",
      });
    }

    if (result.storageMissing) {
      return res.status(409).json({
        success: false,
        message:
          "Document cannot be restored because the stored file is unavailable.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Document restored successfully.",
    });
  } catch (error) {
    console.error(
      "Restore document error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to restore document.",
    });
  }
}

// DOWNLOAD DOCUMENT
// GET /api/documents/:id/download
export async function downloadDocument(
  req,
  res
) {
  let documentId;

  try {
    documentId =
      Number(req.params.id);

    if (
      !Number.isSafeInteger(
        documentId
      ) ||
      documentId <= 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Document not found.",
      });
    }

    const document =
      await getDownloadableDocument({
        documentId,

        userId:
          req.user.userId,
      });

    if (!document) {
      await recordFailedDownload(
        req,
        documentId
      );

      return res.status(404).json({
        success: false,
        message:
          "Document not found.",
      });
    }

    if (document.storageInvalid) {
      await recordFailedDownload(
        req,
        documentId
      );

      return res.status(500).json({
        success: false,
        message:
          "Document storage is invalid.",
      });
    }

    if (document.storageMissing) {
      await recordFailedDownload(
        req,
        documentId
      );

      return res.status(500).json({
        success: false,
        message:
          "Document storage is unavailable.",
      });
    }

    if (document.storageCorrupted) {
      await recordFailedDownload(
        req,
        documentId
      );

      return res.status(500).json({
        success: false,
        message:
          "Document integrity check failed.",
      });
    }

    // ========================================
    // DOWNLOAD AUDIT
    // ========================================

    const connection =
      await db.getConnection();

    try {
      await connection.beginTransaction();

      await createAuditLog(
        connection,
        {
          userId:
            req.user.userId,

          documentId,

          action: "DOWNLOAD",

          success: true,
        }
      );

      await connection.commit();
    } catch (auditError) {
      await connection.rollback();

      console.error(
        "Download audit failed:",
        auditError.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Download could not be completed.",
      });
    } finally {
      connection.release();
    }

    // ========================================
    // RESPONSE HEADERS
    // ========================================

    res.status(200);

    res.setHeader(
      "Content-Type",
      document.mime_type
    );

    res.setHeader(
      "Content-Length",
      String(
        document.file_size
      )
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(
        document.original_filename
      )}`
    );

    res.setHeader(
      "X-Content-Type-Options",
      "nosniff"
    );

    // ========================================
    // STREAM FILE
    // ========================================

    const fileStream =
      fs.createReadStream(
        document.absolutePath
      );

    let streamFinished = false;

    fileStream.on(
      "error",
      (error) => {
        console.error(
          "Document download stream error:",
          error.message
        );

        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message:
              "Unable to download document.",
          });
        }

        res.destroy(error);
      }
    );

    fileStream.on(
      "end",
      () => {
        streamFinished = true;
      }
    );

    res.on(
      "close",
      () => {
        if (!streamFinished) {
          fileStream.destroy();
        }
      }
    );

    fileStream.pipe(res);
  } catch (error) {
    console.error(
      "Download document error:",
      error.message
    );

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message:
          "Unable to download document.",
      });
    }

    res.destroy();
  }
}

// ==========================================
// FAILED DOWNLOAD AUDIT
// ==========================================

async function recordFailedDownload(
  req,
  documentId
) {
  try {
    const connection =
      await db.getConnection();

    try {
      await createAuditLog(
        connection,
        {
          userId:
            req.user?.userId ||
            null,

          documentId,

          action: "DOWNLOAD",

          success: false,
        }
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(
      "Failed download audit error:",
      error.message
    );
  }
}

// ==========================================
// EXPORTS
// ==========================================

export {
  normalizeOriginalFilename,
  calculateSha256,
  inspectFileContent,
};