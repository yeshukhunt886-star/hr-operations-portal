
// Import Express.
import express from "express";

// Import route controller.
import {
    shortestRoute
} from "../controllers/routeController.js";

// Create the router.
const router =
    express.Router();

// Register the shortest-route endpoint.
router.get(
    "/shortest-path",
    shortestRoute
);

// Export the router.
export default router