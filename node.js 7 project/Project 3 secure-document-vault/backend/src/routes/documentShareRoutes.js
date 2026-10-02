import express from "express";

import {
  shareDocument,
  listShares,
  revokeShare,
} from "../controllers/documentShareController.js";

import {
  authMiddleware,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| SHARE DOCUMENT
|--------------------------------------------------------------------------
| POST /api/documents/:documentId/shares
|
| Body:
| {
|   "sharedWithUserId": 2,
|   "permission": "read"
| }
|--------------------------------------------------------------------------
*/
router.post(
  "/:documentId/shares",
  authMiddleware,
  shareDocument
);

/*
|--------------------------------------------------------------------------
| LIST SHARES
|--------------------------------------------------------------------------
| GET /api/documents/:documentId/shares
|--------------------------------------------------------------------------
*/
router.get(
  "/:documentId/shares",
  authMiddleware,
  listShares
);

/*
|--------------------------------------------------------------------------
| REVOKE SHARE
|--------------------------------------------------------------------------
| DELETE /api/documents/:documentId/shares/:shareId
|--------------------------------------------------------------------------
*/
router.delete(
  "/:documentId/shares/:shareId",
  authMiddleware,
  revokeShare
);

export default router;