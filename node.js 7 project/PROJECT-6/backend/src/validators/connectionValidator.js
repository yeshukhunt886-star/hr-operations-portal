export const validateConnection = (data) => {
    const errors = [];

    const sourceLocationId = Number(data.sourceLocationId);
    const destinationLocationId = Number(data.destinationLocationId);
    const weight = Number(data.weight);

    if (
        !Number.isInteger(sourceLocationId) ||
        sourceLocationId <= 0
    ) {
        errors.push("Valid sourceLocationId is required");
    }

    if (
        !Number.isInteger(destinationLocationId) ||
        destinationLocationId <= 0
    ) {
        errors.push("Valid destinationLocationId is required");
    }

    if (
        Number.isInteger(sourceLocationId) &&
        Number.isInteger(destinationLocationId) &&
        sourceLocationId === destinationLocationId
    ) {
        errors.push(
            "Source and destination locations cannot be the same"
        );
    }

    if (
        data.weight === undefined ||
        data.weight === null ||
        data.weight === ""
    ) {
        errors.push("Weight is required");
    } else if (!Number.isFinite(weight)) {
        errors.push("Weight must be a valid number");
    } else if (weight < 0) {
        errors.push(
            "Negative edge weights are not allowed because Dijkstra is used"
        );
    }

    if (
        data.isDirected !== undefined &&
        typeof data.isDirected !== "boolean"
    ) {
        errors.push("isDirected must be true or false");
    }

    return errors;
};