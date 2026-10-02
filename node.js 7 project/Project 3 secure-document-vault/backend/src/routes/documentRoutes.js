import express from "express";
import multer from "multer";

import {
  authenticate,
} from "../middleware/authMiddleware.js";

import {
  uploadSingleDocument,
  MAX_FILE_SIZE,
} from "../middleware/uploadMiddleware.js";

import {
  uploadDocument,
  listDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  restoreDocumentController,
  downloadDocument,
} from "../controllers/documentController.js";

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Upload
|--------------------------------------------------------------------------
*/

router.post(
  "/upload",
  authenticate,

  (req, res, next) => {
    uploadSingleDocument(
      req,
      res,
      async (error) => {
        if (!error) {
          return next();
        }

        if (
          error instanceof
          multer.MulterError
        ) {
          if (
            error.code ===
            "LIMIT_FILE_SIZE"
          ) {
            return res.status(413).json({
              success: false,
              message:
                `File exceeds the maximum allowed size of ${Math.floor(
                  MAX_FILE_SIZE /
                    1024 /
                    1024
                )} MB.`,
            });
          }

          return res.status(400).json({
            success: false,
            message:
              "Invalid file upload request.",
          });
        }

        return res.status(400).json({
          success: false,
          message:
            error.message ||
            "File upload failed.",
        });
      }
    );
  },

  uploadDocument
);

/*
|--------------------------------------------------------------------------
| List
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authenticate,
  listDocuments
);

/*
|--------------------------------------------------------------------------
| Download
|--------------------------------------------------------------------------
|
| Put download before generic :id routes
| for clarity.
|--------------------------------------------------------------------------
*/

router.get(
  "/:id/download",
  authenticate,
  downloadDocument
);

/*
|--------------------------------------------------------------------------
| Restore
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/restore",
  authenticate,
  restoreDocumentController
);

/*
|--------------------------------------------------------------------------
| Metadata
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  authenticate,
  getDocument
);

/*
|--------------------------------------------------------------------------
| Update metadata
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id",
  authenticate,
  updateDocument
);

// Soft delete
router.delete(
  "/:id",
  authenticate,
  deleteDocument
);

export default router;