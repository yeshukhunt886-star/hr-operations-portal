import { useEffect, useState } from "react";

import api from "../services/api.js";

import ConnectionForm
    from "../components/ConnectionForm.jsx";

const Connections = () => {
    const [locations, setLocations] =
        useState([]);

    const [connections, setConnections] =
        useState([]);

    const [editingConnection, setEditingConnection] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [graphVersion, setGraphVersion] =
        useState(null);

    const loadData = async () => {
        try {
            setLoading(true);
            setError("");

            const [
                locationsResponse,
                connectionsResponse
            ] = await Promise.all([
                api.get("/locations"),
                api.get("/connections")
            ]);

            setLocations(
                locationsResponse.data.data || []
            );

            setConnections(
                connectionsResponse.data.data || []
            );

            setGraphVersion(
                connectionsResponse.data.graphVersion
            );
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Failed to load connection data"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSubmit = async (data) => {
        try {
            setError("");

            let response;

            if (editingConnection) {
                response = await api.patch(
                    `/connections/${editingConnection.id}`,
                    {
                        weight: data.weight,
                        isDirected:
                            data.isDirected
                    }
                );

                alert(
                    "Connection updated successfully"
                );

                setEditingConnection(null);
            } else {
                response = await api.post(
                    "/connections",
                    data
                );

                alert(
                    "Connection created successfully"
                );
            }

            setGraphVersion(
                response.data.graphVersion
            );

            await loadData();
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                err.response?.data?.errors?.join(", ") ||
                "Connection operation failed"
            );
        }
    };

    const handleDelete = async (id) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this connection?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");

            const response =
                await api.delete(
                    `/connections/${id}`
                );

            setGraphVersion(
                response.data.graphVersion
            );

            alert(
                "Connection deleted successfully"
            );

            await loadData();
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Failed to delete connection"
            );
        }
    };

    const getLocationName = (id) => {
        const location =
            locations.find(
                (item) => item.id === id
            );

        if (!location) {
            return `Location #${id}`;
        }

        return `${location.code} - ${location.name}`;
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>
                        Connection Master
                    </h1>

                    <p>
                        Manage weighted graph
                        connections between locations.
                    </p>
                </div>

                <div className="stats-container">
                    <div className="stat-card">
                        <strong>
                            {connections.length}
                        </strong>

                        <span>
                            Connections
                        </span>
                    </div>

                    <div className="stat-card">
                        <strong>
                            {graphVersion ?? "-"}
                        </strong>

                        <span>
                            Graph Version
                        </span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            {locations.length < 2 && (
                <div className="alert alert-warning">
                    Create at least two locations
                    before adding a connection.
                </div>
            )}

            <div className="two-column">
                <ConnectionForm
                    locations={locations}
                    editingConnection={
                        editingConnection
                    }
                    onSubmit={handleSubmit}
                    onCancel={() =>
                        setEditingConnection(null)
                    }
                />

                <div className="card">
                    <div className="card-header">
                        <h2>
                            All Connections
                        </h2>

                        <button
                            className="btn btn-secondary"
                            onClick={loadData}
                        >
                            Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="loading">
                            Loading connections...
                        </div>
                    ) : connections.length ===
                      0 ? (
                        <div className="empty">
                            No connections found.
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Source</th>
                                        <th>Destination</th>
                                        <th>Weight</th>
                                        <th>Direction</th>
                                        <th>Actions</th>
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
                                                    {
                                                        connection.id
                                                    }
                                                </td>

                                                <td>
                                                    {getLocationName(
                                                        connection.sourceLocationId
                                                    )}
                                                </td>

                                                <td>
                                                    {getLocationName(
                                                        connection.destinationLocationId
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
                                                    {connection.isDirected ? (
                                                        <span className="badge badge-directed">
                                                            →
                                                            Directed
                                                        </span>
                                                    ) : (
                                                        <span className="badge badge-bidirectional">
                                                            ↔
                                                            Bidirectional
                                                        </span>
                                                    )}
                                                </td>

                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="btn btn-small"
                                                            onClick={() =>
                                                                setEditingConnection(
                                                                    connection
                                                                )
                                                            }
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            className="btn btn-small btn-danger"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    connection.id
                                                                )
                                                            }
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Connections;