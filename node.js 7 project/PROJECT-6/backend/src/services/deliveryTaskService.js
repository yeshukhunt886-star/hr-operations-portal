import pool from "../config/db.js";
import DeliveryPriorityQueue from "../dsa/DeliveryPriorityQueue.js";

// Allowed delivery priority values.
const MIN_PRIORITY = 1;
const MAX_PRIORITY = 5;

// Generate a unique delivery task code.
const generateTaskCode = () => {
    const timestamp = Date.now();

    const random =
        Math.floor(
            Math.random() * 10000
        )
            .toString()
            .padStart(4, "0");

    return `DLV-${timestamp}-${random}`;
};

// Validate a delivery priority.
const validatePriority = (priority) => {
    const value = Number(priority);

    if (
        !Number.isInteger(value) ||
        value < MIN_PRIORITY ||
        value > MAX_PRIORITY
    ) {
        const error = new Error(
            "Priority must be an integer between 1 and 5"
        );

        error.statusCode = 400;

        throw error;
    }

    return value;
};

// Verify that a location exists.
const ensureLocationExists = async (
    locationId,
    fieldName
) => {
    const [rows] = await pool.execute(
        `
        SELECT id
        FROM locations
        WHERE id = ?
        `,
        [locationId]
    );

    if (rows.length === 0) {
        const error = new Error(
            `${fieldName} location does not exist`
        );

        error.statusCode = 404;

        throw error;
    }

    return rows[0];
};

// Create a new delivery task.
export const createDeliveryTask = async (
    data
) => {
    const sourceLocationId =
        Number(data.sourceLocationId);

    const destinationLocationId =
        Number(data.destinationLocationId);

    if (
        !Number.isInteger(sourceLocationId) ||
        sourceLocationId <= 0
    ) {
        const error = new Error(
            "sourceLocationId must be a positive integer"
        );

        error.statusCode = 400;

        throw error;
    }

    if (
        !Number.isInteger(destinationLocationId) ||
        destinationLocationId <= 0
    ) {
        const error = new Error(
            "destinationLocationId must be a positive integer"
        );

        error.statusCode = 400;

        throw error;
    }

    if (
        sourceLocationId ===
        destinationLocationId
    ) {
        const error = new Error(
            "Source and destination cannot be the same"
        );

        error.statusCode = 400;

        throw error;
    }

    const priority =
        validatePriority(data.priority);

    await ensureLocationExists(
        sourceLocationId,
        "Source"
    );

    await ensureLocationExists(
        destinationLocationId,
        "Destination"
    );

    const taskCode =
        generateTaskCode();

    await pool.execute(
        `
        INSERT INTO delivery_tasks (
            task_code,
            source_location_id,
            destination_location_id,
            priority,
            deadline
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            taskCode,
            sourceLocationId,
            destinationLocationId,
            priority,
            data.deadline || null
        ]
    );

    return getDeliveryTaskByCode(
        taskCode
    );
};

// Get one delivery task.
export const getDeliveryTaskById =
    async (id) => {
        const [rows] = await pool.execute(
            `
            SELECT
                dt.*,
                source.code AS source_code,
                source.name AS source_name,
                destination.code AS destination_code,
                destination.name AS destination_name
            FROM delivery_tasks dt
            JOIN locations source
                ON source.id =
                dt.source_location_id
            JOIN locations destination
                ON destination.id =
                dt.destination_location_id
            WHERE dt.id = ?
            `,
            [id]
        );

        if (rows.length === 0) {
            const error = new Error(
                "Delivery task not found"
            );

            error.statusCode = 404;

            throw error;
        }

        return rows[0];
    };

// Get one task using its task code.
export const getDeliveryTaskByCode =
    async (taskCode) => {
        const [rows] = await pool.execute(
            `
            SELECT id
            FROM delivery_tasks
            WHERE task_code = ?
            `,
            [taskCode]
        );

        if (rows.length === 0) {
            const error = new Error(
                "Delivery task not found"
            );

            error.statusCode = 404;

            throw error;
        }

        return getDeliveryTaskById(
            rows[0].id
        );
    };

// Get all delivery tasks.
export const getDeliveryTasks =
    async () => {
        const [rows] = await pool.execute(
            `
            SELECT
                dt.*,
                source.code AS source_code,
                source.name AS source_name,
                destination.code AS destination_code,
                destination.name AS destination_name
            FROM delivery_tasks dt
            JOIN locations source
                ON source.id =
                dt.source_location_id
            JOIN locations destination
                ON destination.id =
                dt.destination_location_id
            ORDER BY dt.created_at DESC
            `
        );

        return rows;
    };

// Build priority queue from pending delivery tasks.
export const getPriorityQueue = async () => {
    const [rows] = await pool.execute(
        `
        SELECT
            id,
            task_code,
            source_external_id,
            source_location_id,
            destination_location_id,
            customer_name,
            priority,
            deadline,
            status,
            created_at,
            updated_at
        FROM delivery_tasks
        WHERE status = 'PENDING'
        ORDER BY id ASC
        `
    );

    const queue =
        new DeliveryPriorityQueue();

    for (const task of rows) {
        queue.enqueue(task);
    }

    return queue.toArray();
};

// Preview the next pending delivery.
export const peekNextDelivery = async () => {
    const tasks =
        await getPriorityQueue();

    if (tasks.length === 0) {
        return null;
    }

    return tasks[0];
};

// Process the next highest-priority delivery.
export const processNextDelivery = async () => {
    const tasks =
        await getPriorityQueue();

    if (tasks.length === 0) {
        return null;
    }

    const nextTask = tasks[0];

    const [updateResult] =
        await pool.execute(
            `
            UPDATE delivery_tasks
            SET status = 'PROCESSING'
            WHERE id = ?
              AND status = 'PENDING'
            `,
            [nextTask.id]
        );

    if (updateResult.affectedRows === 0) {
        return null;
    }

    const [rows] =
        await pool.execute(
            `
            SELECT
                id,
                task_code,
                source_external_id,
                source_location_id,
                destination_location_id,
                customer_name,
                priority,
                deadline,
                status,
                created_at,
                updated_at
            FROM delivery_tasks
            WHERE id = ?
            `,
            [nextTask.id]
        );

    return rows[0] || null;
};

// Update delivery task status.
export const updateDeliveryStatus =
    async (id, status) => {
        const allowedStatuses = [
            "PENDING",
            "PROCESSING",
            "COMPLETED",
            "CANCELLED"
        ];

        if (
            !allowedStatuses.includes(status)
        ) {
            const error = new Error(
                "Invalid delivery status"
            );

            error.statusCode = 400;

            throw error;
        }

        const [result] =
            await pool.execute(
                `
                UPDATE delivery_tasks
                SET status = ?
                WHERE id = ?
                `,
                [status, id]
            );

        if (result.affectedRows === 0) {
            const error = new Error(
                "Delivery task not found"
            );

            error.statusCode = 404;

            throw error;
        }

        return getDeliveryTaskById(id);
    };

