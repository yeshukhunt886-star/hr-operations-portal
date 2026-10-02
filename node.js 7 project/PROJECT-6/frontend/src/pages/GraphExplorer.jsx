
import { useEffect, useState } from "react";
import api from "../services/api.js";

const GraphExplorer = () => {
    const [locations, setLocations] = useState([]);
    const [connections, setConnections] = useState([]);

    const [startLocation, setStartLocation] = useState("");
    const [destinationLocation, setDestinationLocation] = useState("");

    const [result, setResult] = useState(null);
    const [algorithm, setAlgorithm] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // =========================================================
    // LOAD GRAPH
    // =========================================================

    const loadGraph = async () => {
        try {
            setLoading(true);
            setError("");

            const [
                locationResponse,
                connectionResponse
            ] = await Promise.all([
                api.get("/locations"),
                api.get("/connections")
            ]);

            const locationData =
                locationResponse.data?.data;

            const connectionData =
                connectionResponse.data?.data;

            setLocations(
                Array.isArray(locationData)
                    ? locationData
                    : []
            );

            setConnections(
                Array.isArray(connectionData)
                    ? connectionData
                    : []
            );
        } catch (err) {
            console.error("GRAPH LOAD ERROR:", err);

            setError(
                err.response?.data?.message ||
                err.message ||
                "Failed to load graph"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGraph();
    }, []);

    // =========================================================
    // EXTRACT BFS / DFS RESULT
    // =========================================================

    const getTraversalLocations = () => {
        if (!result) {
            return [];
        }

        const data = result.data;

        if (Array.isArray(data)) {
            return data;
        }

        if (
            data &&
            Array.isArray(data.locations)
        ) {
            return data.locations;
        }

        if (
            data &&
            Array.isArray(data.visited)
        ) {
            return data.visited;
        }

        if (
            data &&
            Array.isArray(data.order)
        ) {
            return data.order;
        }

        if (
            data &&
            Array.isArray(data.traversal)
        ) {
            return data.traversal;
        }

        if (Array.isArray(result.locations)) {
            return result.locations;
        }

        if (Array.isArray(result.visited)) {
            return result.visited;
        }

        if (Array.isArray(result.order)) {
            return result.order;
        }

        if (Array.isArray(result.traversal)) {
            return result.traversal;
        }

        return [];
    };

    // =========================================================
    // EXTRACT DIJKSTRA PATH
    // =========================================================

    const getShortestPath = () => {
        if (!result) {
            return [];
        }

        const data = result.data;

        if (
            data &&
            Array.isArray(data.path)
        ) {
            return data.path;
        }

        if (Array.isArray(result.path)) {
            return result.path;
        }

        return [];
    };

    // =========================================================
    // EXTRACT DIJKSTRA DISTANCE
    // =========================================================

    const getDistance = () => {
        if (!result) {
            return null;
        }

        const data = result.data;

        if (
            data &&
            data.distance !== undefined &&
            data.distance !== null
        ) {
            return data.distance;
        }

        if (
            result.distance !== undefined &&
            result.distance !== null
        ) {
            return result.distance;
        }

        return null;
    };

    // =========================================================
    // EXTRACT REACHABLE STATUS
    // =========================================================

    const getReachable = () => {
        if (!result) {
            return null;
        }

        const data = result.data;

        if (
            data &&
            typeof data.reachable === "boolean"
        ) {
            return data.reachable;
        }

        if (
            typeof result.reachable === "boolean"
        ) {
            return result.reachable;
        }

        return null;
    };

    // =========================================================
    // RUN BFS / DFS / DIJKSTRA
    // =========================================================

    const runAlgorithm = async (type) => {
        if (!startLocation) {
            setError(
                "Please select a starting location."
            );
            return;
        }

        if (
            type === "dijkstra" &&
            !destinationLocation
        ) {
            setError(
                "Please select a destination location."
            );
            return;
        }

        if (
            type === "dijkstra" &&
            Number(startLocation) ===
                Number(destinationLocation)
        ) {
            setError(
                "Starting and destination locations cannot be the same."
            );
            return;
        }

        try {
            setError("");
            setResult(null);
            setAlgorithm(type);
            setLoading(true);

            let response;

            if (type === "bfs") {
                response = await api.get(
                    `/graph/bfs/${startLocation}`
                );

                console.log(
                    "[BFS RESULT]",
                    response.data
                );
            }

            if (type === "dfs") {
                response = await api.get(
                    `/graph/dfs/${startLocation}`
                );

                console.log(
                    "[DFS RESULT]",
                    response.data
                );
            }

            if (type === "dijkstra") {
                response = await api.get(
                    "/routes/shortest-path",
                    {
                        params: {
                            source: startLocation,
                            destination: destinationLocation
                        }
                    }
                );

                console.log(
                    "[DIJKSTRA RESULT]",
                    response.data
                );
            }

            if (!response) {
                throw new Error(
                    "Invalid algorithm selected."
                );
            }

            setResult(response.data);
        } catch (err) {
            console.error(
                `${type.toUpperCase()} ERROR:`,
                err
            );

            setResult(null);

            setError(
                err.response?.data?.message ||
                err.message ||
                "Algorithm request failed"
            );
        } finally {
            setLoading(false);
        }
    };

    // =========================================================
    // LOCATION HELPERS
    // =========================================================

    const getLocation = (id) => {
        return locations.find(
            (location) =>
                Number(location.id) ===
                Number(id)
        );
    };

    const getLocationLabel = (id) => {
        const location = getLocation(id);

        if (!location) {
            return `Location #${id}`;
        }

        return `${location.code} - ${location.name}`;
    };

    // =========================================================
    // RESULT DATA
    // =========================================================

    const traversalLocations =
        getTraversalLocations();

    const shortestPath =
        getShortestPath();

    const distance =
        getDistance();

    const reachable =
        getReachable();

    // =========================================================
    // UI
    // =========================================================

    return (
        <div className="page">

            {/* PAGE HEADER */}
            <div className="page-header">
                <div>
                    <h1>
                        🧠 Graph Explorer
                    </h1>

                    <p>
                        Test BFS, DFS and Dijkstra
                        algorithms on the logistics graph.
                    </p>
                </div>

                <div className="stats-container">

                    <div className="stat-card">
                        <strong>
                            {locations.length}
                        </strong>

                        <span>
                            Nodes
                        </span>
                    </div>

                    <div className="stat-card">
                        <strong>
                            {connections.length}
                        </strong>

                        <span>
                            Edges
                        </span>
                    </div>

                </div>
            </div>

            {/* ERROR */}
            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            {/* ALGORITHM CONTROLS + RESULT */}
            <div className="two-column">

                {/* CONTROLS */}
                <div className="card">

                    <h2>
                        Algorithm Controls
                    </h2>

                    {/* START LOCATION */}
                    <div className="form-group">

                        <label>
                            Starting Location
                        </label>

                        <select
                            value={startLocation}
                            onChange={(event) => {
                                setStartLocation(
                                    event.target.value
                                );

                                setResult(null);
                                setError("");
                            }}
                        >
                            <option value="">
                                Select starting location
                            </option>

                            {locations.map(
                                (location) => (
                                    <option
                                        key={location.id}
                                        value={location.id}
                                    >
                                        {location.code}
                                        {" - "}
                                        {location.name}
                                    </option>
                                )
                            )}
                        </select>

                    </div>

                    {/* DESTINATION */}
                    <div className="form-group">

                        <label>
                            Destination Location
                        </label>

                        <select
                            value={destinationLocation}
                            onChange={(event) => {
                                setDestinationLocation(
                                    event.target.value
                                );

                                setResult(null);
                                setError("");
                            }}
                        >
                            <option value="">
                                Select destination
                            </option>

                            {locations.map(
                                (location) => (
                                    <option
                                        key={location.id}
                                        value={location.id}
                                    >
                                        {location.code}
                                        {" - "}
                                        {location.name}
                                    </option>
                                )
                            )}
                        </select>

                    </div>

                    {/* BUTTONS */}
                    <div className="algorithm-buttons">

                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() =>
                                runAlgorithm("bfs")
                            }
                            disabled={loading}
                        >
                            {loading &&
                            algorithm === "bfs"
                                ? "Running..."
                                : "Run BFS"}
                        </button>

                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() =>
                                runAlgorithm("dfs")
                            }
                            disabled={loading}
                        >
                            {loading &&
                            algorithm === "dfs"
                                ? "Running..."
                                : "Run DFS"}
                        </button>

                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() =>
                                runAlgorithm(
                                    "dijkstra"
                                )
                            }
                            disabled={loading}
                        >
                            {loading &&
                            algorithm === "dijkstra"
                                ? "Running..."
                                : "Run Dijkstra"}
                        </button>

                    </div>

                </div>

                {/* RESULT */}
                <div className="card">

                    <h2>
                        Algorithm Result
                    </h2>

                    {!result && (
                        <div className="empty">
                            Select an algorithm to
                            calculate a result.
                        </div>
                    )}

                    {/* BFS / DFS RESULT */}
                    {result &&
                        algorithm !== "dijkstra" && (
                            <div className="algorithm-result">

                                <div className="result-title">
                                    {algorithm.toUpperCase()}
                                </div>

                                <h3>
                                    Traversal Order
                                </h3>

                                {traversalLocations.length === 0 ? (
                                    <div className="empty">
                                        No reachable
                                        locations found.
                                    </div>
                                ) : (
                                    <div className="path">

                                        {traversalLocations.map(
                                            (
                                                locationId,
                                                index,
                                                values
                                            ) => (
                                                <span
                                                    key={`${locationId}-${index}`}
                                                    className="path-item"
                                                >

                                                    <span className="path-node">
                                                        {getLocationLabel(
                                                            locationId
                                                        )}
                                                    </span>

                                                    {index <
                                                        values.length -
                                                            1 && (
                                                        <span className="path-arrow">
                                                            →
                                                        </span>
                                                    )}

                                                </span>
                                            )
                                        )}

                                    </div>
                                )}

                                <div className="result-summary">

                                    <strong>
                                        Locations visited:
                                    </strong>

                                    {" "}

                                    {
                                        traversalLocations.length
                                    }

                                </div>

                            </div>
                        )}

                    {/* DIJKSTRA RESULT */}
                    {result &&
                        algorithm === "dijkstra" && (
                            <div className="algorithm-result">

                                <div className="result-title">
                                    DIJKSTRA
                                </div>

                                <div className="result-distance">

                                    <span>
                                        Shortest Distance
                                    </span>

                                    <strong>
                                        {distance ?? "-"}
                                    </strong>

                                </div>

                                <h3>
                                    Shortest Path
                                </h3>

                                {shortestPath.length === 0 ? (
                                    <div className="empty">
                                        No route found
                                        between the
                                        selected locations.
                                    </div>
                                ) : (
                                    <div className="path">

                                        {shortestPath.map(
                                            (
                                                locationId,
                                                index,
                                                path
                                            ) => (
                                                <span
                                                    key={`${locationId}-${index}`}
                                                    className="path-item"
                                                >

                                                    <span className="path-node">
                                                        {getLocationLabel(
                                                            locationId
                                                        )}
                                                    </span>

                                                    {index <
                                                        path.length -
                                                            1 && (
                                                        <span className="path-arrow">
                                                            →
                                                        </span>
                                                    )}

                                                </span>
                                            )
                                        )}

                                    </div>
                                )}

                                {reachable !== null && (
                                    <div className="result-summary">

                                        <strong>
                                            Reachable:
                                        </strong>

                                        {" "}

                                        {reachable
                                            ? "Yes"
                                            : "No"}

                                    </div>
                                )}

                            </div>
                        )}

                </div>

            </div>

            {/* GRAPH STRUCTURE */}
            <div className="card graph-table-card">

                <div className="card-header">

                    <div>

                        <h2>
                            Graph Structure
                        </h2>

                        <p className="muted">
                            Adjacency-list representation
                            loaded from the backend.
                        </p>

                    </div>

                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={loadGraph}
                        disabled={loading}
                    >
                        Refresh Graph
                    </button>

                </div>

                {connections.length === 0 ? (

                    <div className="empty">
                        No connections available.
                    </div>

                ) : (

                    <div className="table-wrapper">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        Source
                                    </th>

                                    <th>
                                        Destination
                                    </th>

                                    <th>
                                        Weight
                                    </th>

                                    <th>
                                        Direction
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {connections.map(
                                    (connection) => (

                                        <tr
                                            key={
                                                connection.id
                                            }
                                        >

                                            <td>
                                                {getLocationLabel(
                                                    connection.sourceLocationId ??
                                                    connection.source_location_id
                                                )}
                                            </td>

                                            <td>
                                                {getLocationLabel(
                                                    connection.destinationLocationId ??
                                                    connection.destination_location_id
                                                )}
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        connection.weight
                                                    }
                                                </strong>
                                            </td>

                                            <td>

                                                {Number(
                                                    connection.isDirected ??
                                                    connection.is_directed
                                                ) === 1 ? (

                                                    <span className="badge badge-directed">
                                                        →
                                                        {" "}
                                                        Directed
                                                    </span>

                                                ) : (

                                                    <span className="badge badge-bidirectional">
                                                        ↔
                                                        {" "}
                                                        Bidirectional
                                                    </span>

                                                )}

                                            </td>

                                        </tr>
                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                )}

            </div>

            {/* DSA INFORMATION */}
            <div className="card algorithm-info">

                <h2>
                    DSA Information
                </h2>

                <div className="algorithm-info-grid">

                    <div>

                        <h3>
                            BFS
                        </h3>

                        <p>
                            Breadth First Search
                            explores neighboring
                            nodes level by level
                            using a queue.
                        </p>

                        <strong>
                            Complexity: O(V + E)
                        </strong>

                    </div>

                    <div>

                        <h3>
                            DFS
                        </h3>

                        <p>
                            Depth First Search
                            explores each branch
                            before backtracking.
                        </p>

                        <strong>
                            Complexity: O(V + E)
                        </strong>

                    </div>

                    <div>

                        <h3>
                            Dijkstra
                        </h3>

                        <p>
                            Finds the minimum
                            weighted route using
                            the custom MinHeap.
                        </p>

                        <strong>
                            Complexity:
                            O((V + E) log V)
                        </strong>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default GraphExplorer;
