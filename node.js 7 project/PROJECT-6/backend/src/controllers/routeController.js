
import {
    findCachedShortestRoute
} from "../services/routeService.js";

// Convert a request parameter into a valid location ID.
const parseLocationId = (value, fieldName) => {
    // Convert the supplied value to a number.
    const id = Number(value);

    // Reject invalid IDs.
    if (!Number.isInteger(id) || id <= 0) {
        const error = new Error(
            `${fieldName} must be a positive integer`
        );

        error.statusCode = 400;

        throw error;
    }

    // Return the validated ID.
    return id;
};

// Handle shortest-route requests.
export const shortestRoute = async (
    req,
    res,
    next
) => {
    try {
        // Read and validate the source location.
        const source =
            parseLocationId(
                req.query.source,
                "source"
            );

        // Read and validate the destination location.
        const destination =
            parseLocationId(
                req.query.destination,
                "destination"
            );

        // Calculate or retrieve the cached route.
        const result =
            await findCachedShortestRoute(
                source,
                destination
            );

        // Return the route response.
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        // Forward errors to Express error middleware.
        next(error);
    }
};
