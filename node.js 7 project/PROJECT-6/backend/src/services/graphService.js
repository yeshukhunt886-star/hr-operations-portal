
import db from "../config/db.js";
import Graph from "../dsa/Graph.js";

// Load the current logistics graph from MySQL.
//  IMPORTANT:
//  Graph.js remains independent from MySQL.
//  This service is responsible for converting
//  database records into the DSA graph.
export const loadGraph = async () => {
    const graph = new Graph();

    // Load all locations.
    
    const [locations] = await db.execute(`
        SELECT
            id
        FROM locations
        ORDER BY id ASC
    `);

    // Add every location first.
    // This is important because connections
    // reference locations.    
    for (const location of locations) {
        graph.addLocation(location.id);
    }

  
    // Load all connections.
    const [connections] = await db.execute(`
        SELECT
            id,
            source_location_id,
            destination_location_id,
            weight,
            is_directed
        FROM connections
        ORDER BY id ASC
    `);

    // Convert database connections into
    // adjacency-list edges.
    for (const connection of connections) {
        graph.addConnection(
            connection.source_location_id,
            connection.destination_location_id,
            Number(connection.weight),
            Boolean(connection.is_directed)
        );
    }

    return graph;
};


// BFS reachable locations.
export const findReachableByBfs = async (
    startLocation
) => {
    const graph = await loadGraph();

    if (!graph.hasLocation(startLocation)) {
        const error = new Error(
            `Location ${startLocation} does not exist`
        );

        error.statusCode = 404;

        throw error;
    }

    const locations =
        graph.bfs(startLocation);

    return {
        algorithm: "BFS",
        startLocation,
        count: locations.length,
        locations
    };
};


// DFS reachable locations.
export const findReachableByDfs = async (
    startLocation
) => {
    const graph = await loadGraph();

    if (!graph.hasLocation(startLocation)) {
        const error = new Error(
            `Location ${startLocation} does not exist`
        );

        error.statusCode = 404;

        throw error;
    }

    const locations =
        graph.dfs(startLocation);

    return {
        algorithm: "DFS",
        startLocation,
        count: locations.length,
        locations
    };
};


// Dijkstra route
// We implement this now so the same service
// can be used by the Graph Explorer frontend.
export const findShortestRoute = async (
    source,
    destination
) => {
    const graph = await loadGraph();

    if (!graph.hasLocation(source)) {
        const error = new Error(
            `Source location ${source} does not exist`
        );

        error.statusCode = 404;

        throw error;
    }

    if (!graph.hasLocation(destination)) {
        const error = new Error(
            `Destination location ${destination} does not exist`
        );

        error.statusCode = 404;

        throw error;
    }

    return graph.dijkstra(
        source,
        destination
    );
};


// Connected components.
export const findConnectedComponents =
    async () => {
        const graph = await loadGraph();

        const components =
            graph.getConnectedComponents();

        return {
            count: components.length,
            components
        };
    };
