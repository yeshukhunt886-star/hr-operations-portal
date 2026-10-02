import {
    findReachableByBfs,
    findReachableByDfs,
    findShortestRoute,
    findConnectedComponents
} from "../services/graphService.js";


const parseLocationId = (value) => {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        const error = new Error(
            "Location ID must be a positive integer"
        );

        error.statusCode = 400;

        throw error;
    }

    return id;
};


//   GET /api/graph/bfs/:startLocation
export const bfs = async (
    req,
    res,
    next
) => {
    try {
        const startLocation =
            parseLocationId(
                req.params.startLocation
            );

        const result =
            await findReachableByBfs(
                startLocation
            );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

//   GET /api/graph/dfs/:startLocation
export const dfs = async (
    req,
    res,
    next
) => {
    try {
        const startLocation =
            parseLocationId(
                req.params.startLocation
            );

        const result =
            await findReachableByDfs(
                startLocation
            );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};


// GET /api/graph/dijkstra
//   /api/graph/dijkstra?source=1&destination=5
 
export const dijkstra = async (
    req,
    res,
    next
) => {
    try {
        const source =
            parseLocationId(
                req.query.source
            );

        const destination =
            parseLocationId(
                req.query.destination
            );

        const result =
            await findShortestRoute(
                source,
                destination
            );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/graph/components
export const components = async (
    req,
    res,
    next
) => {
    try {
        const result =
            await findConnectedComponents();

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

