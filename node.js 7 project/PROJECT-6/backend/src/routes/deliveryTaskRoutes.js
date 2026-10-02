import express from "express";

import {
    createTask,
    getTasks,
    getTaskById,
    getQueue,
    peekNext,
    processNext,
    updateStatus
} from "../controllers/deliveryTaskController.js";

const router = express.Router();

// Get all pending tasks in priority order.
router.get("/queue", getQueue);

// Preview the next task.
router.get("/next", peekNext);

// Process the next highest-priority task.
router.post("/process-next", processNext);

// Get all delivery tasks.
router.get("/", getTasks);

// Create a delivery task.
router.post("/", createTask);

// Get one delivery task.
router.get("/:id", getTaskById);

// Update task status.
router.patch("/:id/status", updateStatus);

export default router;