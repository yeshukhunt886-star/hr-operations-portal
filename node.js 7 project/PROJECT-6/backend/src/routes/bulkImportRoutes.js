import express from "express";

import {
    uploadBulkImport,
    getBulkImportStatus,
    getBulkImportErrorList,
    cancelBulkImport
} from "../controllers/bulkImportController.js";

import { bulkImportUpload } from "../middleware/bulkImportUpload.js";

const router = express.Router();

router.post(
    "/",
    bulkImportUpload.single("file"),
    uploadBulkImport
);

router.get(
    "/:id",
    getBulkImportStatus
);

router.get(
    "/:id/errors",
    getBulkImportErrorList
);

router.post(
    "/:id/cancel",
    cancelBulkImport
);

export default router;