import express from "express";

import {
    getAnnouncements,
    createAnnouncement,
    deleteAnnouncement
} from "../controllers/announcementController.js";

const router = express.Router();


/*
=====================================================
GET ALL
GET /api/announcements
=====================================================
*/

router.get(
    "/",
    getAnnouncements
);


/*
=====================================================
CREATE
POST /api/announcements
=====================================================
*/

router.post(
    "/",
    createAnnouncement
);


/*
=====================================================
DELETE
DELETE /api/announcements/:id
=====================================================
*/

router.delete(
    "/:id",
    deleteAnnouncement
);


export default router;