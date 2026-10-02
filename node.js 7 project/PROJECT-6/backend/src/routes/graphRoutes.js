
import express from "express";

import {
    bfs,
    dfs,
    dijkstra,
    components
} from "../controllers/graphController.js";

const router =
    express.Router();


/*
 * Reachability
 */
router.get(
    "/bfs/:startLocation",
    bfs
);

router.get(
    "/dfs/:startLocation",
    dfs
);


/*
 * Shortest route
 */
router.get(
    "/dijkstra",
    dijkstra
);


/*
 * Connected components
 */
router.get(
    "/components",
    components
);


export default router;