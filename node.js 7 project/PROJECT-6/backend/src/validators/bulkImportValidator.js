export const REQUIRED_COLUMNS = [
    "task_code",
    "source_code",
    "destination_code",
    "priority"
];

export function normalizeHeader(value) {
    return String(value || "")
        .replace(/^\uFEFF/, "")
        .trim()
        .toLowerCase();
}

export function normalizeRow(row) {
    const normalized = {};

    for (const [key, value] of Object.entries(row)) {
        normalized[normalizeHeader(key)] =
            typeof value === "string"
                ? value.trim()
                : value;
    }

    return normalized;
}

export function validateCsvColumns(columns) {
    const normalizedColumns = columns.map(normalizeHeader);

    const missingColumns = REQUIRED_COLUMNS.filter(
        column => !normalizedColumns.includes(column)
    );

    if (missingColumns.length > 0) {
        return {
            valid: false,
            error: `Missing required columns: ${missingColumns.join(", ")}`
        };
    }

    return {
        valid: true
    };
}

export function validateDeliveryRow(row) {
    const taskCode = String(row.task_code || "").trim();

    const sourceCode = String(row.source_code || "").trim();

    const destinationCode = String(
        row.destination_code || ""
    ).trim();

    const priority = Number(row.priority);

    if (!taskCode) {
        return {
            valid: false,
            code: "MISSING_TASK_CODE",
            message: "task_code is required"
        };
    }

    if (!sourceCode) {
        return {
            valid: false,
            code: "MISSING_SOURCE",
            message: "source_code is required"
        };
    }

    if (!destinationCode) {
        return {
            valid: false,
            code: "MISSING_DESTINATION",
            message: "destination_code is required"
        };
    }

    if (sourceCode === destinationCode) {
        return {
            valid: false,
            code: "SAME_LOCATION",
            message: "Source and destination cannot be the same"
        };
    }

    if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
        return {
            valid: false,
            code: "INVALID_PRIORITY",
            message: "Priority must be an integer from 1 to 5"
        };
    }

    let deadline = null;

    if (row.deadline !== undefined && row.deadline !== "") {
        const parsedDate = new Date(row.deadline);

        if (Number.isNaN(parsedDate.getTime())) {
            return {
                valid: false,
                code: "INVALID_DEADLINE",
                message: "Invalid deadline"
            };
        }

        deadline = row.deadline;
    }

    return {
        valid: true,
        value: {
            taskCode,
            sourceCode,
            destinationCode,
            priority,
            deadline
        }
    };
}