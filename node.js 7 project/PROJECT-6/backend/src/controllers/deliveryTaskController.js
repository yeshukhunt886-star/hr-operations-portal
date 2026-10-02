
import {
    createDeliveryTask,
    getDeliveryTaskById,
    getDeliveryTasks,
    getPriorityQueue,
    peekNextDelivery,
    processNextDelivery,
    updateDeliveryStatus
} from "../services/deliveryTaskService.js";

// Create a delivery task.
export const createTask = async (
    req,
    res,
    next
) => {
    try {
        console.log(
            "CREATE TASK BODY:",
            req.body
        );

        const {
            taskCode,
            task_code,

            sourceLocationId,
            source_location_id,

            destinationLocationId,
            destination_location_id,

            sourceExternalId,
            source_external_id,

            customerName,
            customer_name,

            priority,
            deadline
        } = req.body;

        const task = await createDeliveryTask({
            taskCode:
                taskCode ||
                task_code,

            sourceLocationId:
                sourceLocationId ??
                source_location_id,

            destinationLocationId:
                destinationLocationId ??
                destination_location_id,

            sourceExternalId:
                sourceExternalId ??
                source_external_id,

            customerName:
                customerName ??
                customer_name,

            priority,
            deadline
        });

        res.status(201).json({
            success: true,
            data: task
        });
    } catch (error) {
        console.error(
            "CREATE DELIVERY TASK ERROR:",
            error
        );

        next(error);
    }
};

// Get all delivery tasks.
export const getTasks = async (
    req,
    res,
    next
) => {
    try {
        const tasks =
            await getDeliveryTasks();

        res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {       
        next(error);
    }
};

// Get one delivery task.
export const getTaskById = async (
    req,
    res,
    next
) => {
    try {
        const task =
            await getDeliveryTaskById(
                Number(req.params.id)
            );

        res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
        next(error);
    }
};

// Get the current priority queue.
export const getQueue = async (
    req,
    res,
    next
) => {
    try {
        const tasks =
            await getPriorityQueue();

        res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        next(error);
    }
};

// Preview the next delivery.
export const peekNext = async (
    req,
    res,
    next
) => {
    try {
        const task =
            await peekNextDelivery();

        res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
        next(error);
    }
};

// Process the next highest-priority delivery.
export const processNext = async (req, res, next) => {
    try {
        const task = await processNextDelivery();

        if (!task) {
            return res.status(200).json({
                success: true,
                data: null,
                message: "No pending delivery tasks available"
            });
        }

        return res.status(200).json({
            success: true,
            data: task,
            message: "Delivery task is now processing"
        });
    } catch (error) {
        console.error("PROCESS NEXT DELIVERY ERROR:", error);
        next(error);
    }
};

// Update a delivery task status.
export const updateStatus =
    async (
        req,
        res,
        next
    ) => {
        try {
            const task =
                await updateDeliveryStatus(
                    Number(req.params.id),
                    req.body.status
                );

            res.status(200).json({
                success: true,
                data: task
            });
        } catch (error) {
            next(error);
        }
    };

