import express from "express";

import {
  authenticate,
} from "../middleware/authMiddleware.js";

import {
  createLink,
  listLinks,
  revokeLink,
  accessShareLink,
} from "../controllers/shareLinkController.js";

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Owner-only operations
|--------------------------------------------------------------------------
*/

router.post(
  "/documents/:id/share-links",
  authenticate,
  createLink
);

router.get(
  "/documents/:id/share-links",
  authenticate,
  listLinks
);

router.delete(
  "/documents/:id/share-links/:linkId",
  authenticate,
  revokeLink
);

/*
|--------------------------------------------------------------------------
| Public link access
|--------------------------------------------------------------------------
|
| NO JWT HERE.
|
*/

router.get(
  "/share/:token",
  accessShareLink
);

export default router;