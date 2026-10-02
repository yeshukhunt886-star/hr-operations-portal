import { useEffect, useState } from "react";
import api from "../services/api.js";

// Display a readable priority label.
const getPriorityLabel = (priority) => {
    const labels = {
        1: "Low",
        2: "Normal",
        3: "High",
        4: "Urgent",
        5: "Critical"
    };

    return labels[priority] || "Unknown";
};

// Return a CSS class for priority.
const getPriorityClass = (priority) => {
    return `priority-${priority}`;
};

// Return a CSS class for task status.
const getStatusClass = (status) => {
    return `status-${String(status).toLowerCase()}`;
};

// Format a deadline for display.
const formatDeadline = (deadline) => {
    if (!deadline) {
        return "No deadline";
    }

    return new Date(deadline).toLocaleString();
};

const Deliveries = () => {
    const [locations, setLocations] = useState([]);
    const [tasks, setTasks] = useState([]);

    const [sourceLocationId, setSourceLocationId] =
        useState("");

    const [destinationLocationId, setDestinationLocationId] =
        useState("");

    const [priority, setPriority] =
        useState("3");

    const [deadline, setDeadline] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [processing, setProcessing] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [error, setError] =
        useState("");

    // Load locations from the backend.
    const loadLocations = async () => {
        try {
            const response =
                await api.get("/locations");

            setLocations(
                Array.isArray(response.data?.data)
                    ? response.data.data
                    : []
            );
        } catch (err) {
            console.error(
                "LOAD LOCATIONS ERROR:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Failed to load locations"
            );
        }
    };

    // Load pending delivery tasks from the priority queue.
    const loadQueue = async () => {
        try {
            const response =
                await api.get(
                    "/delivery-tasks/queue"
                );

            setTasks(
                Array.isArray(response.data?.data)
                    ? response.data.data
                    : []
            );
        } catch (err) {
            console.error(
                "LOAD DELIVERY QUEUE ERROR:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Failed to load delivery queue"
            );
        }
    };

    // Load initial page data.
    useEffect(() => {
        loadLocations();
        loadQueue();
    }, []);

    // Create a delivery task.
    const handleCreateTask = async (e) => {
        e.preventDefault();

        setError("");
        setMessage("");
        setLoading(true);

        try {
            const sourceId =
                Number(sourceLocationId);

            const destinationId =
                Number(destinationLocationId);

            const priorityValue =
                Number(priority);

            console.log(
                "CREATE TASK VALUES:",
                {
                    sourceLocationId,
                    destinationLocationId,
                    sourceId,
                    destinationId,
                    priorityValue,
                    deadline
                }
            );

            // Validate source location.
            if (!sourceId) {
                setError(
                    "Please select a source location."
                );
                return;
            }

            // Validate destination location.
            if (!destinationId) {
                setError(
                    "Please select a destination location."
                );
                return;
            }

            // Source and destination must be different.
            if (
                sourceId === destinationId
            ) {
                setError(
                    "Source and destination locations cannot be the same."
                );
                return;
            }

            // Validate priority.
            if (
                priorityValue < 1 ||
                priorityValue > 5
            ) {
                setError(
                    "Priority must be between 1 and 5."
                );
                return;
            }

            // Build the API request payload.
            const payload = {
                sourceLocationId: sourceId,
                destinationLocationId: destinationId,
                priority: priorityValue,
                deadline: deadline || null
            };

            console.log(
                "CREATE DELIVERY TASK PAYLOAD:",
                payload
            );

            // Create the delivery task.
            const response =
                await api.post(
                    "/delivery-tasks",
                    payload
                );

            console.log(
                "CREATE DELIVERY TASK RESPONSE:",
                response.data
            );

            setMessage(
                "Delivery task created successfully."
            );

            // Reload the queue after creation.
            await loadQueue();

            // Reset the form.
            setSourceLocationId("");
            setDestinationLocationId("");
            setPriority("3");
            setDeadline("");
        } catch (err) {
            console.error(
                "CREATE DELIVERY TASK ERROR:",
                err.response?.data || err
            );

            setError(
                err.response?.data?.message ||
                err.message ||
                "Failed to create delivery task."
            );
        } finally {
            setLoading(false);
        }
    };

    // Process the next task from the priority queue.
    const handleProcessNext = async () => {
        setError("");
        setMessage("");

        try {
            setProcessing(true);

            const response =
                await api.post(
                    "/delivery-tasks/process-next"
                );

            const task =
                response.data?.data;

            if (!task) {
                setMessage(
                    "No pending delivery tasks available."
                );

                await loadQueue();

                return;
            }

            setMessage(
                `Processing ${task.task_code}`
            );

            await loadQueue();
        } catch (err) {
            console.error(
                "PROCESS NEXT ERROR:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Failed to process next delivery"
            );
        } finally {
            setProcessing(false);
        }
    };

    // Mark a processing task as completed.
    const handleComplete = async (
        taskId
    ) => {
        try {
            setError("");
            setMessage("");

            await api.patch(
                `/delivery-tasks/${taskId}/status`,
                {
                    status: "COMPLETED"
                }
            );

            setMessage(
                "Delivery task completed."
            );

            await loadQueue();
        } catch (err) {
            console.error(
                "COMPLETE TASK ERROR:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Failed to update task"
            );
        }
    };

    // Find a location by ID.
    const getLocation = (id) => {
        return locations.find(
            (location) =>
                Number(location.id) ===
                Number(id)
        );
    };

    // Display a readable location name.
    const getLocationName = (id) => {
        const location =
            getLocation(id);

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
                        🚚 Delivery Tasks
                    </h1>

                    <p>
                        Create and process delivery
                        tasks using the priority queue.
                    </p>

                </div>

                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleProcessNext}
                    disabled={
                        processing ||
                        tasks.length === 0
                    }
                >
                    {processing
                        ? "Processing..."
                        : "⚡ Process Next Task"}
                </button>

            </div>

            {message && (
                <div className="alert alert-success">
                    {message}
                </div>
            )}

            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            <div className="two-column">

                <div className="card">

                    <h2>
                        Create Delivery Task
                    </h2>

                    <form
                        onSubmit={
                            handleCreateTask
                        }
                    >

                        <div className="form-group">

                            <label>
                                Source Location
                            </label>

                            <select
                                value={
                                    sourceLocationId
                                }
                                onChange={(
                                    event
                                ) => {
                                    setSourceLocationId(
                                        event.target.value
                                    );

                                    setError("");
                                    setMessage("");
                                }}
                            >

                                <option value="">
                                    Select source location
                                </option>

                                {locations.map(
                                    (location) => (
                                        <option
                                            key={
                                                location.id
                                            }
                                            value={
                                                location.id
                                            }
                                        >
                                            {
                                                location.code
                                            }
                                            {" - "}
                                            {
                                                location.name
                                            }
                                        </option>
                                    )
                                )}

                            </select>

                        </div>

                        <div className="form-group">

                            <label>
                                Destination Location
                            </label>

                            <select
                                value={
                                    destinationLocationId
                                }
                                onChange={(
                                    event
                                ) => {
                                    setDestinationLocationId(
                                        event.target.value
                                    );

                                    setError("");
                                    setMessage("");
                                }}
                            >

                                <option value="">
                                    Select destination location
                                </option>

                                {locations.map(
                                    (location) => (
                                        <option
                                            key={
                                                location.id
                                            }
                                            value={
                                                location.id
                                            }
                                        >
                                            {
                                                location.code
                                            }
                                            {" - "}
                                            {
                                                location.name
                                            }
                                        </option>
                                    )
                                )}

                            </select>

                        </div>

                        <div className="form-group">

                            <label>
                                Priority
                            </label>

                            <select
                                value={priority}
                                onChange={(
                                    event
                                ) =>
                                    setPriority(
                                        event.target.value
                                    )
                                }
                            >

                                <option value="5">
                                    5 - Critical
                                </option>

                                <option value="4">
                                    4 - Urgent
                                </option>

                                <option value="3">
                                    3 - High
                                </option>

                                <option value="2">
                                    2 - Normal
                                </option>

                                <option value="1">
                                    1 - Low
                                </option>

                            </select>

                        </div>

                        <div className="form-group">

                            <label>
                                Deadline
                            </label>

                            <input
                                type="datetime-local"
                                value={deadline}
                                onChange={(
                                    event
                                ) =>
                                    setDeadline(
                                        event.target.value
                                    )
                                }
                            />

                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading
                                ? "Creating..."
                                : "➕ Create Delivery Task"}
                        </button>

                    </form>

                </div>

                <div className="card">

                    <div className="card-header">

                        <div>

                            <h2>
                                Queue Summary
                            </h2>

                            <p className="muted">
                                Tasks are ordered
                                using the custom
                                MinHeap.
                            </p>

                        </div>

                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={loadQueue}
                            disabled={processing}
                        >
                            Refresh
                        </button>

                    </div>

                    <div className="queue-summary">

                        <div className="queue-stat">

                            <strong>
                                {tasks.length}
                            </strong>

                            <span>
                                Pending Tasks
                            </span>

                        </div>

                        <div className="queue-stat">

                            <strong>
                                {tasks.filter(
                                    (task) =>
                                        Number(
                                            task.priority
                                        ) === 5
                                ).length}
                            </strong>

                            <span>
                                Critical
                            </span>

                        </div>

                        <div className="queue-stat">

                            <strong>
                                {tasks.filter(
                                    (task) =>
                                        Number(
                                            task.priority
                                        ) >= 4
                                ).length}
                            </strong>

                            <span>
                                Urgent+
                            </span>

                        </div>

                    </div>

                    {tasks.length > 0 && (
                        <div className="next-task">

                            <span>
                                Next Task
                            </span>

                            <strong>
                                {tasks[0].task_code}
                            </strong>

                            <span>
                                {
                                    getPriorityLabel(
                                        Number(
                                            tasks[0].priority
                                        )
                                    )
                                }
                            </span>

                        </div>
                    )}

                </div>

            </div>

            <div className="card delivery-queue-card">

                <div className="card-header">

                    <div>

                        <h2>
                            Delivery Task Queue
                        </h2>

                        <p className="muted">
                            Highest priority tasks
                            appear first.
                        </p>

                    </div>

                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={
                            handleProcessNext
                        }
                        disabled={
                            processing ||
                            tasks.length === 0
                        }
                    >
                        {processing
                            ? "Processing..."
                            : "⚡ Process Next Task"}
                    </button>

                </div>

                {tasks.length === 0 ? (

                    <div className="empty">
                        No pending delivery tasks.
                    </div>

                ) : (

                    <div className="table-wrapper">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        #
                                    </th>

                                    <th>
                                        Task
                                    </th>

                                    <th>
                                        Source
                                    </th>

                                    <th>
                                        Destination
                                    </th>

                                    <th>
                                        Priority
                                    </th>

                                    <th>
                                        Deadline
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Action
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {tasks.map(
                                    (
                                        task,
                                        index
                                    ) => (

                                        <tr
                                            key={
                                                task.id
                                            }
                                        >

                                            <td>
                                                {index + 1}
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        task.task_code
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                {getLocationName(
                                                    task.source_location_id ??
                                                    task.sourceLocationId
                                                )}
                                            </td>

                                            <td>
                                                {getLocationName(
                                                    task.destination_location_id ??
                                                    task.destinationLocationId
                                                )}
                                            </td>

                                            <td>

                                                <span
                                                    className={`priority-badge ${getPriorityClass(
                                                        Number(
                                                            task.priority
                                                        )
                                                    )}`}
                                                >
                                                    {
                                                        getPriorityLabel(
                                                            Number(
                                                                task.priority
                                                            )
                                                        )
                                                    }
                                                </span>

                                            </td>

                                            <td>
                                                {formatDeadline(
                                                    task.deadline
                                                )}
                                            </td>

                                            <td>

                                                <span
                                                    className={`status-badge ${getStatusClass(
                                                        task.status
                                                    )}`}
                                                >
                                                    {
                                                        task.status
                                                    }
                                                </span>

                                            </td>

                                            <td>

                                                {task.status ===
                                                    "PROCESSING" && (

                                                    <button
                                                        type="button"
                                                        className="btn btn-small"
                                                        onClick={() =>
                                                            handleComplete(
                                                                task.id
                                                            )
                                                        }
                                                    >
                                                        Complete
                                                    </button>

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

            <div className="card priority-rules">

                <h2>
                    Priority Queue Rules
                </h2>

                <div className="priority-rules-grid">

                    <div>
                        <strong>1</strong>
                        <span>
                            Low
                        </span>
                    </div>

                    <div>
                        <strong>2</strong>
                        <span>
                            Normal
                        </span>
                    </div>

                    <div>
                        <strong>3</strong>
                        <span>
                            High
                        </span>
                    </div>

                    <div>
                        <strong>4</strong>
                        <span>
                            Urgent
                        </span>
                    </div>

                    <div>
                        <strong>5</strong>
                        <span>
                            Critical
                        </span>
                    </div>

                </div>

                <p className="muted">
                    When two tasks have the same
                    priority, the earlier deadline
                    is processed first. If deadlines
                    are also equal, task ID provides
                    deterministic ordering.
                </p>

            </div>

        </div>
    );
};

export default Deliveries;

