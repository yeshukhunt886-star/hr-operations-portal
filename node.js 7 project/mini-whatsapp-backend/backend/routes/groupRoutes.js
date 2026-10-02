import express from "express";

import authMiddleware
    from "../middleware/authMiddleware.js";

import {
    getMyGroups,
    createGroup
} from "../controllers/groupController.js";

const router = express.Router();

router.get(
    "/",
    authMiddleware,
    getMyGroups
);

router.post(
    "/",
    authMiddleware,
    createGroup
);

export default router;