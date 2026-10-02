import { useEffect, useState } from "react";

const initialForm = {
    code: "",
    name: "",
    latitude: "",
    longitude: ""
};

const LocationForm = ({
    editingLocation,
    onSubmit,
    onCancel
}) => {
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (editingLocation) {
            setForm({
                code: editingLocation.code || "",
                name: editingLocation.name || "",
                latitude:
                    editingLocation.latitude ?? "",
                longitude:
                    editingLocation.longitude ?? ""
            });
        } else {
            setForm(initialForm);
        }
    }, [editingLocation]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setLoading(true);

        try {
            await onSubmit({
                code: form.code.trim(),
                name: form.name.trim(),
                latitude:
                    form.latitude === ""
                        ? null
                        : Number(form.latitude),
                longitude:
                    form.longitude === ""
                        ? null
                        : Number(form.longitude)
            });

            if (!editingLocation) {
                setForm(initialForm);
            }
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
                {editingLocation
                    ? "Edit Location"
                    : "Add Location"}
            </h2>

            <div className="form-group">
                <label>Location Code</label>

                <input
                    type="text"
                    name="code"
                    value={form.code}
                    onChange={handleChange}
                    placeholder="WH001"
                    maxLength={50}
                    required
                />
            </div>

            <div className="form-group">
                <label>Location Name</label>

                <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Main Warehouse"
                    maxLength={255}
                    required
                />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label>Latitude</label>

                    <input
                        type="number"
                        name="latitude"
                        value={form.latitude}
                        onChange={handleChange}
                        placeholder="21.1702"
                        step="any"
                        min="-90"
                        max="90"
                    />
                </div>

                <div className="form-group">
                    <label>Longitude</label>

                    <input
                        type="number"
                        name="longitude"
                        value={form.longitude}
                        onChange={handleChange}
                        placeholder="72.8311"
                        step="any"
                        min="-180"
                        max="180"
                    />
                </div>
            </div>

            <div className="button-row">
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                >
                    {loading
                        ? "Saving..."
                        : editingLocation
                            ? "Update Location"
                            : "Add Location"}
                </button>

                {editingLocation && (
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

export default LocationForm;