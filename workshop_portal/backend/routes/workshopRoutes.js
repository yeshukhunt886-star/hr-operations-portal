
import express from "express";

import {
    createWorkshop,
    getWorkshops,
    getWorkshopById,
    updateWorkshop,
    deleteWorkshop
} from "../controllers/workshopController.js";

import workshopUpload from "../middleware/workshopUpload.js";

const router = express.Router();


router.post(
    "/",
    workshopUpload.single("banner"),
    createWorkshop
);


router.get(
    "/",
    getWorkshops
);


router.get(
    "/:id",
    getWorkshopById
);


router.put(
    "/:id",
    workshopUpload.single("banner"),
    updateWorkshop
);


router.delete(
    "/:id",
    deleteWorkshop
);


export default router;

