import fs from "fs";
import { pipeline } from "stream/promises";
import { parse } from "csv-parse";
import { Transform } from "stream";

import pool from "../config/db.js";

import {
    normalizeRow,
    validateCsvColumns,
    validateDeliveryRow
} from "../validators/bulkImportValidator.js";

const BATCH_SIZE = 500;

const activeJobs = new Map();

// Clean up uploaded file.
function cleanupFile(filePath) {
    if (!filePath) {
        return;
    }

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error(
            "[BulkImport] File cleanup failed:",
            error.message
        );
    }
}

// Update fields that actually exist in bulk_import_jobs.
async function updateJob(jobId, values) {
    const fields = [];
    const parameters = [];

  const allowedFields = new Set([
    "status",
    "processed_rows",
    "successful_rows",
    "failed_rows",
    "skipped_rows",
    "started_at",
    "completed_at"
]);

    for (const [key, value] of Object.entries(values)) {
        if (!allowedFields.has(key)) {
            continue;
        }

        fields.push(`${key} = ?`);
        parameters.push(value);
    }

    if (fields.length === 0) {
        return;
    }

    parameters.push(jobId);

    await pool.query(
        `
        UPDATE bulk_import_jobs
        SET ${fields.join(", ")}
        WHERE id = ?
        `,
        parameters
    );
}

// Store row-level import errors.
async function insertImportErrors(jobId, errors) {
    if (!errors.length) {
        return;
    }

    const values = [];

    for (const error of errors) {
        values.push([
            jobId,
            error.rowNumber,
            error.code,
            error.message,
            JSON.stringify(error.rowData || {})
        ]);
    }

    const placeholders = values
        .map(() => "(?, ?, ?, ?, ?)")
        .join(",");

    const parameters = values.flat();

    await pool.query(
        `
        INSERT INTO bulk_import_errors
        (
            job_id,
            row_number,
            error_code,
            error_message,
            row_data
        )
        VALUES ${placeholders}
        `,
        parameters
    );
}

// Insert only rows that have already passed duplicate detection.
async function insertDeliveryBatch(batch) {
    if (!batch.length) {
        return 0;
    }

    const placeholders = batch
        .map(() => "(?, ?, ?, ?, ?)")
        .join(",");

    const parameters = [];

    for (const row of batch) {
        parameters.push(
            row.taskCode,
            row.sourceLocationId,
            row.destinationLocationId,
            row.priority,
            row.deadline
        );
    }

    const [result] = await pool.query(
        `
        INSERT IGNORE INTO delivery_tasks
        (
            task_code,
            source_location_id,
            destination_location_id,
            priority,
            deadline
        )
        VALUES ${placeholders}
        `,
        parameters
    );

    return Number(
        result.affectedRows || 0
    );
}

// Find task codes that already exist in the database.
async function findExistingTaskCodes(taskCodes) {
    if (!taskCodes.length) {
        return new Set();
    }

    const placeholders = taskCodes
        .map(() => "?")
        .join(",");

    const [rows] = await pool.query(
        `
        SELECT task_code
        FROM delivery_tasks
        WHERE task_code IN (${placeholders})
        `,
        taskCodes
    );

    return new Set(
        rows.map(row =>
            String(row.task_code)
                .trim()
                .toUpperCase()
        )
    );
}


// Remove duplicate task codes while recording skipped rows.
async function prepareBatchForInsert(
    batch,
    jobId,
    errors
) {
    if (!batch.length) {
        return {
            rows: [],
            skipped: 0
        };
    }

    const taskCodes = batch.map(row =>
        String(row.taskCode)
            .trim()
            .toUpperCase()
    );

    const existingCodes =
        await findExistingTaskCodes(
            taskCodes
        );

    const seenCodes = new Set();

    const rowsToInsert = [];

    let skipped = 0;

    for (const row of batch) {
        const normalizedTaskCode =
            String(row.taskCode)
                .trim()
                .toUpperCase();

        // Duplicate inside the current CSV.
        if (
            seenCodes.has(
                normalizedTaskCode
            )
        ) {
            skipped++;

            errors.push({
                rowNumber: row.rowNumber,
                code: "DUPLICATE_TASK_CODE",
                message:
                    `Duplicate task_code in CSV: ${row.taskCode}`,
                rowData: row.originalRow
            });

            continue;
        }

        seenCodes.add(
            normalizedTaskCode
        );

        // Duplicate already present in database.
        if (
            existingCodes.has(
                normalizedTaskCode
            )
        ) {
            skipped++;

            errors.push({
                rowNumber: row.rowNumber,
                code: "TASK_CODE_EXISTS",
                message:
                    `Task code already exists: ${row.taskCode}`,
                rowData: row.originalRow
            });

            continue;
        }

        rowsToInsert.push(row);
    }

    if (errors.length >= 100) {
        await insertImportErrors(
            jobId,
            errors.splice(
                0,
                errors.length
            )
        );
    }

    return {
        rows: rowsToInsert,
        skipped
    };
}

// Build a location lookup map.
async function loadLocationMap() {
    const [rows] = await pool.query(
        `
        SELECT id, code
        FROM locations
        `
    );

    const locationMap = new Map();

    for (const row of rows) {
        if (!row.code) {
            continue;
        }

        locationMap.set(
            String(row.code)
                .trim()
                .toUpperCase(),
            row.id
        );
    }

    return locationMap;
}

// Process one CSV import job.
async function processImportJob(
    jobId,
    filePath
) {
    activeJobs.set(jobId, {
        cancelled: false
    });

    let totalRows = 0;
    let processedRows = 0;
    let successfulRows = 0;
    let failedRows = 0;
    let skippedRows = 0;

    let rowNumber = 1;

    const batch = [];
    const errors = [];

    try {
        await updateJob(jobId, {
            status: "PROCESSING",
            started_at: new Date(),
            processed_rows: 0,
            successful_rows: 0,
            failed_rows: 0
        });

        console.log(
            `[BulkImport] Job ${jobId} started`
        );

        const locationMap =
            await loadLocationMap();

        let headerValidated = false;

        const parser = parse({
            bom: true,
            columns: true,
            skip_empty_lines: true,
            relax_column_count: true,
            trim: true,
            relax_quotes: true
        });

        const transformStream =
            new Transform({
                objectMode: true,

                transform(
                    row,
                    _encoding,
                    callback
                ) {
                    (async () => {
                        const jobState =
                            activeJobs.get(
                                jobId
                            );

                        if (
                            jobState?.cancelled
                        ) {
                            throw new Error(
                                "IMPORT_CANCELLED"
                            );
                        }

                        totalRows++;
                        rowNumber++;

                        const normalizedRow =
                            normalizeRow(row);

                        if (!headerValidated) {
                            const result =
                                validateCsvColumns(
                                    Object.keys(
                                        normalizedRow
                                    )
                                );

                            if (!result.valid) {
                                throw new Error(
                                    result.error
                                );
                            }

                            headerValidated = true;
                        }

                        const validation =
                            validateDeliveryRow(
                                normalizedRow
                            );

                        if (!validation.valid) {
                            failedRows++;

                            errors.push({
                                rowNumber,
                                code:
                                    validation.code,
                                message:
                                    validation.message,
                                rowData:
                                    normalizedRow
                            });

                            processedRows++;

                            if (
                                errors.length >=
                                100
                            ) {
                                await insertImportErrors(
                                    jobId,
                                    errors.splice(
                                        0,
                                        errors.length
                                    )
                                );
                            }

                            return;
                        }

                        const data =
                            validation.value;

                        const sourceLocationId =
                            locationMap.get(
                                String(
                                    data.sourceCode
                                )
                                    .trim()
                                    .toUpperCase()
                            );

                        const destinationLocationId =
                            locationMap.get(
                                String(
                                    data.destinationCode
                                )
                                    .trim()
                                    .toUpperCase()
                            );

                        if (!sourceLocationId) {
                            failedRows++;

                            errors.push({
                                rowNumber,
                                code:
                                    "SOURCE_NOT_FOUND",
                                message:
                                    `Source location not found: ${data.sourceCode}`,
                                rowData:
                                    normalizedRow
                            });

                            processedRows++;

                            return;
                        }

                        if (
                            !destinationLocationId
                        ) {
                            failedRows++;

                            errors.push({
                                rowNumber,
                                code:
                                    "DESTINATION_NOT_FOUND",
                                message:
                                    `Destination location not found: ${data.destinationCode}`,
                                rowData:
                                    normalizedRow
                            });

                            processedRows++;

                            return;
                        }

                        batch.push({
                                taskCode:
                                    data.taskCode,
                                sourceLocationId,
                                destinationLocationId,
                                priority:
                                    data.priority,
                                deadline:
                                    data.deadline,
                                rowNumber,
                                originalRow:
                                    normalizedRow
                            });

                        if (
                                batch.length >=
                                BATCH_SIZE
                            ) {
                                const currentBatch =
                                    batch.splice(
                                        0,
                                        batch.length
                                    );

                                const prepared =
                                    await prepareBatchForInsert(
                                        currentBatch,
                                        jobId,
                                        errors
                                    );

                                skippedRows +=
                                    prepared.skipped;

                                const inserted =
                                    await insertDeliveryBatch(
                                        prepared.rows
                                    );

                                successfulRows +=
                                        inserted;
                            }
                        processedRows++;

                        if (
                            processedRows % 500 ===
                            0
                        ) {
                            await updateJob(
                                jobId,
                                {
                                    processed_rows:
                                        processedRows,
                                    successful_rows:
                                        successfulRows,
                                    failed_rows:
                                        failedRows,
                                    skipped_rows:
                                        skippedRows
                                }
                            );

                            console.log(
                                `[BulkImport] Job ${jobId}: processed=${processedRows}, successful=${successfulRows}, failed=${failedRows}`
                            );
                        }
                    })()
                        .then(() => {
                            callback();
                        })
                        .catch((error) => {
                            callback(error);
                        });
                }
            });

        await pipeline(
            fs.createReadStream(filePath, {
                encoding: "utf8",
                highWaterMark:
                    64 * 1024
            }),
            parser,
            transformStream
        );

       if (batch.length > 0) {
            const remainingBatch =
                batch.splice(
                    0,
                    batch.length
                );

            const prepared =
                await prepareBatchForInsert(
                    remainingBatch,
                    jobId,
                    errors
                );

            skippedRows +=
                prepared.skipped;

            const inserted =
                await insertDeliveryBatch(
                    prepared.rows
                );

            successfulRows +=
                inserted;
        }

        if (errors.length > 0) {
            await insertImportErrors(
                jobId,
                errors.splice(
                    0,
                    errors.length
                )
            );
        }

        const finalState =
            activeJobs.get(jobId);

        const finalStatus =
            finalState?.cancelled
                ? "CANCELLED"
                : totalRows === 0
                    ? "EMPTY"
                    : "COMPLETED";

        await updateJob(jobId, {
            status: finalStatus,
            processed_rows: processedRows,
            successful_rows:
                successfulRows,
            failed_rows: failedRows,
            skipped_rows:
                skippedRows,
            completed_at: new Date()
        });

        console.log(
            `[BulkImport] Job ${jobId} finished with status ${finalStatus}`
        );

        return {
                jobId,
                totalRows,
                processedRows,
                successfulRows,
                failedRows,
                skippedRows,
                status: finalStatus
            };
    } catch (error) {
        console.error(
            `[BulkImport] Job ${jobId} failed:`,
            error.message
        );

        if (errors.length > 0) {
            try {
                await insertImportErrors(
                    jobId,
                    errors.splice(
                        0,
                        errors.length
                    )
                );
            } catch (errorInsertError) {
                console.error(
                    "[BulkImport] Failed to save import errors:",
                    errorInsertError.message
                );
            }
        }

        const cancelled =
            error.message ===
            "IMPORT_CANCELLED";

        await updateJob(jobId, {
            status: cancelled
                ? "CANCELLED"
                : "FAILED",
            processed_rows:
                processedRows,
            successful_rows:
                successfulRows,
            failed_rows:
                failedRows,
            skipped_rows:
                skippedRows,
            completed_at:
                new Date()
        });
        return {
            jobId,
            totalRows,
            processedRows,
            successfulRows,
            failedRows,
            status: cancelled
                ? "CANCELLED"
                : "FAILED",
            error: error.message
        };
    } finally {
        activeJobs.delete(jobId);
        cleanupFile(filePath);
    }
}

// Create a bulk import job and start processing.
export const createBulkImportJob = async (file) => {
    if (!file) {
        throw new Error(
            "Uploaded file is required"
        );
    }

    const originalFilename =
        file.originalname ||
        "unknown.csv";

    const filePath =
        file.path ||
        file.filename;

    if (!filePath) {
        throw new Error(
            "Uploaded file path is missing"
        );
    }

    console.log(
        "[BulkImport] Uploaded file:",
        file
    );

    console.log(
        "[BulkImport] File path:",
        filePath
    );

    // Create the job.
    const [result] =
        await pool.execute(
            `
            INSERT INTO bulk_import_jobs
            (
                original_filename,
                status
            )
            VALUES (?, 'PROCESSING')
            `,
            [originalFilename]
        );

    const jobId =
        Number(result.insertId);

    console.log(
        `[BulkImport] Job ${jobId} created`
    );

    // Mark the job as started immediately.
    await updateJob(jobId, {
        status: "PROCESSING",
        started_at: new Date(),
        processed_rows: 0,
        successful_rows: 0,
        failed_rows: 0
    });

    console.log(
        `[BulkImport] Job ${jobId} marked PROCESSING`
    );

    // Start the streaming import in the background.
    setImmediate(() => {
        processImportJob(
            jobId,
            filePath
        )
            .then((result) => {
                console.log(
                    `[BulkImport] Background job ${jobId} completed:`,
                    result
                );
            })
            .catch(async (error) => {
                console.error(
                    `[BulkImport] Background job ${jobId} crashed:`,
                    error
                );

                try {
                    await updateJob(jobId, {
                        status: "FAILED",
                        completed_at: new Date()
                    });
                } catch (updateError) {
                    console.error(
                        `[BulkImport] Failed to mark job ${jobId} as FAILED:`,
                        updateError.message
                    );
                }
            });
    });

    // Return only after the job has been persisted and marked PROCESSING.
    return jobId;
};

// Get one bulk import job.
export async function getBulkImportJob(
    jobId
) {
    const [rows] =
        await pool.query(
            `
            SELECT
                id,
                original_filename,
                status,
                processed_rows,
                successful_rows,
                failed_rows,
                skipped_rows,
                started_at,
                completed_at,
                created_at
            FROM bulk_import_jobs
            WHERE id = ?
            `,
            [jobId]
        );

    if (!rows.length) {
        const error = new Error(
            "Bulk import job not found"
        );

        error.statusCode = 404;

        throw error;
    }

    return rows[0];
}

// Get row-level import errors.
export async function getBulkImportErrors(
    jobId
) {
    const [rows] =
        await pool.query(
            `
            SELECT
                id,
                row_number,
                error_code,
                error_message,
                row_data,
                created_at
            FROM bulk_import_errors
            WHERE job_id = ?
            ORDER BY row_number ASC
            LIMIT 1000
            `,
            [jobId]
        );

    return rows;
}

// Cancel a pending or processing job.
export async function cancelBulkImportJob(
    jobId
) {
    const job =
        await getBulkImportJob(jobId);

    if (
        job.status !== "PENDING" &&
        job.status !== "PROCESSING"
    ) {
        throw new Error(
            `Cannot cancel job with status ${job.status}`
        );
    }

    const state =
        activeJobs.get(
            Number(jobId)
        );

    if (state) {
        state.cancelled = true;
    }

    await updateJob(jobId, {
        status: "CANCELLED"
    });

    return getBulkImportJob(jobId);
}