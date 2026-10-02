
import { loadGraph } from "./graphService.js";

// Import route cache functions.
import {
    getRouteCache,
    setRouteCache
} from "../cache/routeCache.js";

// Import database connection.
import db from "../config/db.js";

// Get the current graph version.
export const getGraphVersion = async () => {
    // Check whether the graph_versions table exists and contains a current version.
    const [rows] = await db.execute(`
        SELECT version
        FROM graph_versions
        ORDER BY id DESC
        LIMIT 1
    `);

    // Create the initial graph version when no row exists.
    if (rows.length === 0) {
        await db.execute(`
            INSERT INTO graph_versions (version)
            VALUES (1)
        `);

        return 1;
    }

    // Return the latest graph version.
    return Number(rows[0].version);
};

// Increase the graph version after a graph mutation.
export const bumpGraphVersion = async () => {
    // Read the current graph version.
    const currentVersion =
        await getGraphVersion();

    // Calculate the next version.
    const nextVersion =
        currentVersion + 1;

    // Insert a new graph version.
    await db.execute(`
        INSERT INTO graph_versions (version)
        VALUES (?)
    `, [nextVersion]);

    // Return the new version.
    return nextVersion;
};

// Build a cache key containing every route input that affects the result.
const createRouteCacheKey = (
    graphVersion,
    source,
    destination
) => {
    return `route:v${graphVersion}:${source}:${destination}`;
};

// Find a shortest route with graph-version-aware caching.
export const findCachedShortestRoute = async (
    source,
    destination
) => {
    // Read the current graph version.
    const graphVersion =
        await getGraphVersion();

    // Build the cache key.
    const cacheKey =
        createRouteCacheKey(
            graphVersion,
            source,
            destination
        );

    // Check the cache before running Dijkstra.
    const cached =
        getRouteCache(cacheKey);

    // Return the cached result when available.
    if (cached) {
        return {
            ...cached,
            graphVersion,
            cacheHit: true
        };
    }

    // Load the current graph from MySQL.
    const graph =
        await loadGraph();

    // Validate the source location.
    if (!graph.hasLocation(source)) {
        const error = new Error(
            `Source location ${source} does not exist`
        );

        error.statusCode = 404;

        throw error;
    }

    // Validate the destination location.
    if (!graph.hasLocation(destination)) {
        const error = new Error(
            `Destination location ${destination} does not exist`
        );

        error.statusCode = 404;

        throw error;
    }

    // Run the custom Dijkstra implementation.
    const result =
        graph.dijkstra(
            source,
            destination
        );

    // Build the cacheable response.
    const response = {
        source,
        destination,
        reachable: result.reachable,
        distance: result.distance,
        path: result.path
    };

    // Save the result using the current graph version.
    setRouteCache(
        cacheKey,
        response
    );

    // Return the calculated result.
    return {
        ...response,
        graphVersion,
        cacheHit: false
    };
};
