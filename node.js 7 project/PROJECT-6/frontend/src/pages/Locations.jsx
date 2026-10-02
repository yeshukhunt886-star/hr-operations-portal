import { useEffect, useState } from "react";

import api from "../services/api.js";

import LocationForm
    from "../components/LocationForm.jsx";

const Locations = () => {
    const [locations, setLocations] = useState([]);

    const [editingLocation, setEditingLocation] =
        useState(null);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const loadLocations = async () => {
        try {
            setLoading(true);
            setError("");

            const response =
                await api.get("/locations");

            setLocations(
                response.data.data || []
            );
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Failed to load locations"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLocations();
    }, []);

    const handleSubmit = async (data) => {
        try {
            setError("");

            if (editingLocation) {
                await api.patch(
                    `/locations/${editingLocation.id}`,
                    data
                );

                alert(
                    "Location updated successfully"
                );

                setEditingLocation(null);
            } else {
                await api.post(
                    "/locations",
                    data
                );

                alert(
                    "Location created successfully"
                );
            }

            await loadLocations();
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                err.response?.data?.errors?.join(", ") ||
                "Operation failed"
            );
        }
    };

    const handleDelete = async (id) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this location?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");

            await api.delete(
                `/locations/${id}`
            );

            alert(
                "Location deleted successfully"
            );

            await loadLocations();
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Failed to delete location"
            );
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>Location Master</h1>

                    <p>
                        Manage warehouses, hubs,
                        cities and delivery locations.
                    </p>
                </div>

                <div className="stat-card">
                    <strong>
                        {locations.length}
                    </strong>

                    <span>
                        Total Locations
                    </span>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            <div className="two-column">
                <LocationForm
                    editingLocation={
                        editingLocation
                    }
                    onSubmit={handleSubmit}
                    onCancel={() =>
                        setEditingLocation(null)
                    }
                />

                <div className="card">
                    <div className="card-header">
                        <h2>
                            All Locations
                        </h2>

                        <button
                            className="btn btn-secondary"
                            onClick={loadLocations}
                        >
                            Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="loading">
                            Loading locations...
                        </div>
                    ) : locations.length === 0 ? (
                        <div className="empty">
                            No locations found.
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Code</th>
                                        <th>Name</th>
                                        <th>Latitude</th>
                                        <th>Longitude</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {locations.map(
                                        (location) => (
                                            <tr
                                                key={
                                                    location.id
                                                }
                                            >
                                                <td>
                                                    {
                                                        location.id
                                                    }
                                                </td>

                                                <td>
                                                    <strong>
                                                        {
                                                            location.code
                                                        }
                                                    </strong>
                                                </td>

                                                <td>
                                                    {
                                                        location.name
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        location.latitude ??
                                                        "-"
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        location.longitude ??
                                                        "-"
                                                    }
                                                </td>

                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="btn btn-small"
                                                            onClick={() =>
                                                                setEditingLocation(
                                                                    location
                                                                )
                                                            }
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            className="btn btn-small btn-danger"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    location.id
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

export default Locations;