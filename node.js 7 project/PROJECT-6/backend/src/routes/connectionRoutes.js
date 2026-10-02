import express from "express";

import {
    create,
    getAll,
    getOne,
    update,
    remove
} from "../controllers/connectionController.js";

const router = express.Router();

router.post("/", create);

router.get("/", getAll);

router.get("/:id", getOne);

router.patch("/:id", update);

router.delete("/:id", remove);

export default router;