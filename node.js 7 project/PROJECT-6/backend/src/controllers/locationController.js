import {
    createLocation,
    getAllLocations,
    getLocationById,
    updateLocation,
    deleteLocation
} from "../services/locationService.js";

import { validateLocation } from "../validators/locationValidator.js";

export const create = async (req, res) => {
    try {
        const errors = validateLocation(req.body);

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }

        const location = await createLocation(req.body);

        return res.status(201).json({
            success: true,
            message: "Location created successfully",
            data: location
        });
    } catch (error) {
        console.error("[Location Create]", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Location code already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to create location"
        });
    }
};

export const getAll = async (req, res) => {
    try {
        const locations = await getAllLocations();

        return res.json({
            success: true,
            count: locations.length,
            data: locations
        });
    } catch (error) {
        console.error("[Location List]", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch locations"
        });
    }
};

export const getOne = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid location ID"
            });
        }

        const location = await getLocationById(id);

        if (!location) {
            return res.status(404).json({
                success: false,
                message: "Location not found"
            });
        }

        return res.json({
            success: true,
            data: location
        });
    } catch (error) {
        console.error("[Location Get]", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch location"
        });
    }
};

export const update = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid location ID"
            });
        }

        const errors = validateLocation(req.body);

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }

        const location = await updateLocation(
            id,
            req.body
        );

        if (!location) {
            return res.status(404).json({
                success: false,
                message: "Location not found"
            });
        }

        return res.json({
            success: true,
            message: "Location updated successfully",
            data: location
        });
    } catch (error) {
        console.error("[Location Update]", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Location code already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to update location"
        });
    }
};

export const remove = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid location ID"
            });
        }

        const location = await deleteLocation(id);

        if (!location) {
            return res.status(404).json({
                success: false,
                message: "Location not found"
            });
        }

        return res.json({
            success: true,
            message: "Location deleted successfully",
            data: location
        });
    } catch (error) {
        console.error("[Location Delete]", error);

        if (
            error.code === "ER_ROW_IS_REFERENCED_2" ||
            error.code === "ER_ROW_IS_REFERENCED"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Location cannot be deleted because connections or delivery tasks reference it"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to delete location"
        });
    }
};