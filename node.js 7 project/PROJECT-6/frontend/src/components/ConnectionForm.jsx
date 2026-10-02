import { useEffect, useState } from "react";

const initialForm = {
    sourceLocationId: "",
    destinationLocationId: "",
    weight: "",
    isDirected: true
};

const ConnectionForm = ({
    locations,
    editingConnection,
    onSubmit,
    onCancel
}) => {
    const [form, setForm] =
        useState(initialForm);

    const [loading, setLoading] =
        useState(false);

    useEffect(() => {
        if (editingConnection) {
            setForm({
                sourceLocationId:
                    editingConnection.sourceLocationId,
                destinationLocationId:
                    editingConnection.destinationLocationId,
                weight:
                    editingConnection.weight,
                isDirected:
                    Boolean(
                        editingConnection.isDirected
                    )
            });
        } else {
            setForm(initialForm);
        }
    }, [editingConnection]);

    const handleChange = (event) => {
        const { name, value, type, checked } =
            event.target;

        setForm((previous) => ({
            ...previous,
            [name]:
                type === "checkbox"
                    ? checked
                    : value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (
            Number(form.sourceLocationId) ===
            Number(form.destinationLocationId)
        ) {
            alert(
                "Source and destination must be different."
            );

            return;
        }

        if (Number(form.weight) < 0) {
            alert(
                "Negative weights are not allowed."
            );

            return;
        }

        setLoading(true);

        try {
            await onSubmit({
                sourceLocationId:
                    Number(
                        form.sourceLocationId
                    ),

                destinationLocationId:
                    Number(
                        form.destinationLocationId
                    ),

                weight:
                    Number(form.weight),

                isDirected:
                    form.isDirected
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            className="card form-card"
            onSubmit={handleSubmit}
        >
            <h2>
                {editingConnection
                    ? "Edit Connection"
                    : "Add Connection"}
            </h2>

            <div className="form-group">
                <label>
                    Source Location
                </label>

                <select
                    name="sourceLocationId"
                    value={
                        form.sourceLocationId
                    }
                    onChange={handleChange}
                    required
                >
                    <option value="">
                        Select source
                    </option>

                    {locations.map(
                        (location) => (
                            <option
                                key={location.id}
                                value={location.id}
                            >
                                {location.code} -{" "}
                                {location.name}
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
                    name="destinationLocationId"
                    value={
                        form.destinationLocationId
                    }
                    onChange={handleChange}
                    required
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
                                {location.code} -{" "}
                                {location.name}
                            </option>
                        )
                    )}
                </select>
            </div>

            <div className="form-group">
                <label>
                    Weight / Cost
                </label>

                <input
                    type="number"
                    name="weight"
                    value={form.weight}
                    onChange={handleChange}
                    min="0"
                    step="any"
                    placeholder="25"
                    required
                />

                <small>
                    Negative weights are not allowed.
                </small>
            </div>

            <div className="checkbox-group">
                <input
                    type="checkbox"
                    id="isDirected"
                    name="isDirected"
                    checked={form.isDirected}
                    onChange={handleChange}
                />

                <label htmlFor="isDirected">
                    Directed connection
                </label>
            </div>

            <p className="help-text">
                Uncheck this for a
                bidirectional connection.
            </p>

            <div className="button-row">
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                >
                    {loading
                        ? "Saving..."
                        : editingConnection
                            ? "Update Connection"
                            : "Add Connection"}
                </button>

                {editingConnection && (
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
};

export default ConnectionForm;