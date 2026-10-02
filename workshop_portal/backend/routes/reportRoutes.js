import express from "express";

import {

getSummaryReport,
getWorkshopReport,
getParticipantReport

}
from "../controllers/reportController.js";


const router = express.Router();



// Summary
router.get(
"/summary",
getSummaryReport
);



// Workshop report
router.get(
"/workshops",
getWorkshopReport
);



// Participant report
router.get(
"/participants",
getParticipantReport
);



export default router;