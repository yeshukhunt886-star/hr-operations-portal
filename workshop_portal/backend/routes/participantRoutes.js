import express from "express";

import {

    addParticipant,
    getParticipants,
    getParticipantsByWorkshop,
    getParticipantById,
    updateParticipant,
    deleteParticipant,
    importParticipants

} from "../controllers/participantController.js";


import csvUpload from "../middleware/csvUploadMiddleware.js";


const router = express.Router();





/*
CREATE PARTICIPANT

POST /api/participants
*/

router.post(
    "/",
    addParticipant
);





/*
CSV IMPORT

POST /api/participants/import
*/

router.post(

    "/import",

    csvUpload.single("file"),

    importParticipants

);





/*
GET ALL PARTICIPANTS

GET /api/participants
*/

router.get(
    "/",
    getParticipants
);





/*
GET PARTICIPANTS BY WORKSHOP

GET /api/participants/workshop/:workshopId
*/

router.get(

    "/workshop/:workshopId",

    getParticipantsByWorkshop

);





/*
GET SINGLE PARTICIPANT

GET /api/participants/:id
*/

router.get(

    "/:id",

    getParticipantById

);





/*
UPDATE PARTICIPANT

PUT /api/participants/:id
*/

router.put(

    "/:id",

    updateParticipant

);





/*
DELETE PARTICIPANT

DELETE /api/participants/:id
*/

router.delete(

    "/:id",

    deleteParticipant

);



export default router;