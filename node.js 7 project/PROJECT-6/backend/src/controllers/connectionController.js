import {
    createConnection,
    getAllConnections,
    getConnectionById,
    updateConnection,
    deleteConnection,
    getGraphVersion
} from "../services/connectionService.js";

import {
    validateConnection
} from "../validators/connectionValidator.js";

export const create = async (req, res) => {
    try {
        const errors = validateConnection(req.body);

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }

        const connection =
            await createConnection({
                sourceLocationId:
                    Number(req.body.sourceLocationId),

                destinationLocationId:
                    Number(req.body.destinationLocationId),

                weight:
                    Number(req.body.weight),

                isDirected:
                    req.body.isDirected ?? true
            });

        const graphVersion =
            await getGraphVersion();

        return res.status(201).json({
            success: true,
            message: "Connection created successfully",
            graphVersion,
            data: connection
        });
    } catch (error) {
        console.error(
            "[Connection Create]",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message:
                error.message ||
                "Failed to create connection"
        });
    }
};

export const getAll = async (req, res) => {
    try {
        const connections =
            await getAllConnections();

        const graphVersion =
            await getGraphVersion();

        return res.json({
            success: true,
            count: connections.length,
            graphVersion,
            data: connections
        });
    } catch (error) {
        console.error(
            "[Connection List]",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch connections"
        });
    }
};

export const getOne = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid connection ID"
            });
        }

        const connection =
            await getConnectionById(id);

        if (!connection) {
            return res.status(404).json({
                success: false,
                message: "Connection not found"
            });
        }

        return res.json({
            success: true,
            data: connection
        });
    } catch (error) {
        console.error(
            "[Connection Get]",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch connection"
        });
    }
};

export const update = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid connection ID"
            });
        }

        const errors =
            validateConnection({
                sourceLocationId: 1,
                destinationLocationId: 2,
                weight: req.body.weight,
                isDirected: req.body.isDirected
            });

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }

        if (
            req.body.weight === undefined ||
            req.body.isDirected === undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "weight and isDirected are required when updating a connection"
            });
        }

        const connection =
            await updateConnection(
                id,
                {
                    weight:
                        Number(req.body.weight),

                    isDirected:
                        req.body.isDirected
                }
            );

        const graphVersion =
            await getGraphVersion();

        return res.json({
            success: true,
            message: "Connection updated successfully",
            graphVersion,
            data: connection
        });
    } catch (error) {
        console.error(
            "[Connection Update]",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message:
                error.message ||
                "Failed to update connection"
        });
    }
};

export const remove = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid connection ID"
            });
        }

        const deleted =
            await deleteConnection(id);

        const graphVersion =
            await getGraphVersion();

        return res.json({
            success: true,
            message:
                "Connection deleted successfully",
            graphVersion,
            data: deleted
        });
    } catch (error) {
        console.error(
            "[Connection Delete]",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message:
                error.message ||
                "Failed to delete connection"
        });
    }
};