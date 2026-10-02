import {
    createBulkImportJob,
    getBulkImportJob,
    getBulkImportErrors,
    cancelBulkImportJob
} from "../services/bulkImportService.js";

// Upload a CSV and start a bulk import job.
export async function uploadBulkImport(
    req,
    res
) {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message:
                    "CSV file is required"
            });
        }

        console.log(
            "[BulkImportController] Uploaded file:",
            {
                originalname:
                    req.file.originalname,
                filename:
                    req.file.filename,
                path:
                    req.file.path,
                size:
                    req.file.size
            }
        );

        const job =
            await createBulkImportJob(
                req.file
            );

        return res.status(202).json({
            success: true,
            message:
                "Bulk import started",
            job
        });
    } catch (error) {
        console.error(
            "[BulkImportController] Upload error:",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message:
                error.message ||
                "Bulk import failed"
        });
    }
}

// Get import job status.
export async function getBulkImportStatus(
    req,
    res
) {
    try {
        const job =
            await getBulkImportJob(
                req.params.id
            );

        return res.json({
            success: true,
            job
        });
    } catch (error) {
        return res.status(
            error.statusCode || 404
        ).json({
            success: false,
            message:
                error.message ||
                "Bulk import job not found"
        });
    }
}

// Get import errors.
export async function getBulkImportErrorList(
    req,
    res
) {
    try {
        const errors =
            await getBulkImportErrors(
                req.params.id
            );

        return res.json({
            success: true,
            errors
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to load import errors"
        });
    }
}

// Cancel an import job.
export async function cancelBulkImport(
    req,
    res
) {
    try {
        const job =
            await cancelBulkImportJob(
                req.params.id
            );

        return res.json({
            success: true,
            message:
                "Cancellation requested",
            job
        });
    } catch (error) {
        return res.status(
            error.statusCode || 400
        ).json({
            success: false,
            message:
                error.message ||
                "Failed to cancel import"
        });
    }
}