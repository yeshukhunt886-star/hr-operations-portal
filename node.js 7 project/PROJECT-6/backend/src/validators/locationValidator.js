export const validateLocation = (data) => {
    const errors = [];

    if (!data.code || typeof data.code !== "string") {
        errors.push("Location code is required");
    }

    if (!data.name || typeof data.name !== "string") {
        errors.push("Location name is required");
    }

    if (data.code && data.code.length > 50) {
        errors.push("Location code cannot exceed 50 characters");
    }

    if (data.name && data.name.length > 255) {
        errors.push("Location name cannot exceed 255 characters");
    }

    if (
        data.latitude !== undefined &&
        data.latitude !== null &&
        (Number.isNaN(Number(data.latitude)) ||
            Number(data.latitude) < -90 ||
            Number(data.latitude) > 90)
    ) {
        errors.push("Latitude must be between -90 and 90");
    }

    if (
        data.longitude !== undefined &&
        data.longitude !== null &&
        (Number.isNaN(Number(data.longitude)) ||
            Number(data.longitude) < -180 ||
            Number(data.longitude) > 180)
    ) {
        errors.push("Longitude must be between -180 and 180");
    }

    return errors;
};