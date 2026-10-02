import express from "express";

import {
    getCheckInParticipants,
    checkInParticipant,
    checkOutParticipant
} from "../controllers/checkinController.js";

const router = express.Router();


/*
=====================================================
GET ALL PARTICIPANTS
GET /api/checkin
=====================================================
*/
router.get(
    "/",
    getCheckInParticipants
);


/*
=====================================================
CHECK IN
POST /api/checkin/check-in
=====================================================
*/
router.post(
    "/check-in",
    checkInParticipant
);


/*
=====================================================
CHECK OUT
POST /api/checkin/check-out
=====================================================
*/
router.post(
    "/check-out",
    checkOutParticipant
);


/*
=====================================================
EXPORT ROUTER
=====================================================
*/
export default router;