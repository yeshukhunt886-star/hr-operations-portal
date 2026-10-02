import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import pool from "../config/db.js";
import { createAuditLog } from "./auditLogService.js";

const SHARE_TOKEN_HASH_ALGORITHM = "sha256";

function hashShareToken(token) {
    return crypto
        .createHash(SHARE_TOKEN_HASH_ALGORITHM)
        .update(token, "utf8")
        .digest("hex");
}

function normalizeToken(token) {
    if (typeof token !== "string") {
        return null;
    }

    const normalized = token.trim();

    if (!/^[A-Za-z0-9_-]{32,256}$/.test(normalized)) {
        return null;
    }

    return normalized;
}

function safeStoragePath(storagePath) {
    if (typeof storagePath !== "string" || !storagePath.trim()) {
        return null;
    }

    return path.resolve(storagePath);
}

/**
 * Get share link + document information using the public token.
 *
 * IMPORTANT:
 * The raw token is never stored in the database.
 * Only SHA-256(token) is used for lookup.
 */
export async function getShareLinkForDownload(token) {
    const normalizedToken = normalizeToken(token);

    if (!normalizedToken) {
        return {
            ok: false,
            statusCode: 404,
            code: "INVALID_SHARE_LINK",
            message: "Share link is invalid or unavailable."
        };
    }

    const tokenHash = hashShareToken(normalizedToken);

    const connection = await pool.getConnection();

    try {
        const [rows] = await connection.execute(
            `
            SELECT
                sl.id,
                sl.document_id,
                sl.token_hash,
                sl.permission,
                sl.expires_at,
                sl.revoked_at,
                sl.max_uses,
                sl.use_count,

                d.owner_id,
                d.original_filename,
                d.mime_type,
                d.file_size,
                d.storage_path,
                d.storage_key,
                d.status AS document_status,
                d.deleted_at

            FROM share_links sl
            INNER JOIN documents d
                ON d.id = sl.document_id

            WHERE sl.token_hash = ?
            LIMIT 1
            `,
            [tokenHash]
        );

        if (rows.length === 0) {
            return {
                ok: false,
                statusCode: 404,
                code: "INVALID_SHARE_LINK",
                message: "Share link is invalid or unavailable."
            };
        }

        const shareLink = rows[0];

        /*
         * Get server-side database time.
         *
         * IMPORTANT:
         * Use currentTime, not current_time.
         */
        const [timeRows] = await connection.execute(
            `
            SELECT CURRENT_TIMESTAMP AS currentTime
            `
        );

        const currentTime = timeRows[0].currentTime;

        /*
         * Revoked link.
         */
        if (shareLink.revoked_at !== null) {
            return {
                ok: false,
                statusCode: 410,
                code: "SHARE_LINK_REVOKED",
                message: "This share link has been revoked."
            };
        }

        /*
         * Expired link.
         *
         * The link is considered expired when:
         *
         * currentTime >= expires_at
         */
        if (
            shareLink.expires_at !== null &&
            new Date(currentTime) >= new Date(shareLink.expires_at)
        ) {
            return {
                ok: false,
                statusCode: 410,
                code: "SHARE_LINK_EXPIRED",
                message: "This share link has expired."
            };
        }

        /*
         * Deleted document.
         */
        if (
            shareLink.deleted_at !== null ||
            shareLink.document_status === "deleted"
        ) {
            return {
                ok: false,
                statusCode: 404,
                code: "DOCUMENT_UNAVAILABLE",
                message: "The requested document is unavailable."
            };
        }

        /*
         * Only download-capable links can download.
         */
        const permission = String(
            shareLink.permission || ""
        ).toLowerCase();

        if (!["read", "download", "read_download"].includes(permission)) {
            return {
                ok: false,
                statusCode: 403,
                code: "DOWNLOAD_NOT_ALLOWED",
                message: "This share link does not permit downloading."
            };
        }

        /*
         * Max-use protection.
         *
         * We do NOT trust use_count from an earlier SELECT.
         * The actual increment happens atomically.
         */
        if (
            shareLink.max_uses !== null &&
            Number(shareLink.use_count) >= Number(shareLink.max_uses)
        ) {
            return {
                ok: false,
                statusCode: 410,
                code: "SHARE_LINK_LIMIT_REACHED",
                message: "This share link has reached its usage limit."
            };
        }

        /*
         * Physical storage path.
         *
         * storage_key is preferred.
         * storage_path is supported for existing records.
         */
        const rawStorageValue =
            shareLink.storage_key || shareLink.storage_path;

        const absolutePath = safeStoragePath(rawStorageValue);

        if (!absolutePath) {
            return {
                ok: false,
                statusCode: 500,
                code: "STORAGE_CONFIGURATION_ERROR",
                message: "The requested file is unavailable."
            };
        }

        /*
         * Prevent accidental directory traversal outside
         * the configured storage root when STORAGE_ROOT exists.
         */
        const storageRoot = process.env.STORAGE_ROOT
            ? path.resolve(process.env.STORAGE_ROOT)
            : null;

        if (
            storageRoot &&
            !absolutePath.startsWith(`${storageRoot}${path.sep}`)
        ) {
            return {
                ok: false,
                statusCode: 500,
                code: "STORAGE_CONFIGURATION_ERROR",
                message: "The requested file is unavailable."
            };
        }

        /*
         * Check file before consuming the share.
         */
        let stat;

        try {
            stat = await fs.promises.stat(absolutePath);
        } catch (error) {
            if (error.code === "ENOENT") {
                return {
                    ok: false,
                    statusCode: 404,
                    code: "FILE_NOT_FOUND",
                    message: "The requested file is unavailable."
                };
            }

            console.error("Share-link storage stat error:", error);

            return {
                ok: false,
                statusCode: 500,
                code: "STORAGE_ERROR",
                message: "The requested file is temporarily unavailable."
            };
        }

        if (!stat.isFile()) {
            return {
                ok: false,
                statusCode: 404,
                code: "FILE_NOT_FOUND",
                message: "The requested file is unavailable."
            };
        }

        /*
         * Atomically consume one use.
         *
         * This prevents two simultaneous requests from both
         * consuming the final available use.
         */
        if (shareLink.max_uses !== null) {
            const [updateResult] = await connection.execute(
                `
                UPDATE share_links
                SET use_count = use_count + 1
                WHERE id = ?
                  AND revoked_at IS NULL
                  AND (
                      expires_at IS NULL
                      OR expires_at > CURRENT_TIMESTAMP
                  )
                  AND (
                      max_uses IS NULL
                      OR use_count < max_uses
                  )
                `,
                [shareLink.id]
            );

            if (updateResult.affectedRows !== 1) {
                return {
                    ok: false,
                    statusCode: 410,
                    code: "SHARE_LINK_LIMIT_REACHED",
                    message: "This share link is no longer available."
                };
            }
        } else {
            /*
             * Keep usage tracking useful even when unlimited.
             */
            await connection.execute(
                `
                UPDATE share_links
                SET use_count = use_count + 1
                WHERE id = ?
                  AND revoked_at IS NULL
                  AND (
                      expires_at IS NULL
                      OR expires_at > CURRENT_TIMESTAMP
                  )
                `,
                [shareLink.id]
            );
        }

        return {
            ok: true,
            shareLink: {
                id: shareLink.id,
                documentId: shareLink.document_id,
                ownerId: shareLink.owner_id,
                permission: shareLink.permission,
                expiresAt: shareLink.expires_at,
                maxUses: shareLink.max_uses
                    ? Number(shareLink.max_uses)
                    : null
            },
            document: {
                id: shareLink.document_id,
                originalFilename:
                    shareLink.original_filename || "download",
                mimeType:
                    shareLink.mime_type ||
                    "application/octet-stream",
                fileSize: Number(
                    shareLink.file_size ?? stat.size
                ),
                storagePath: absolutePath
            }
        };
    } finally {
        connection.release();
    }
}

/**
 * Stream a share-link file.
 *
 * The file is never loaded completely into RAM.
 */
export async function streamShareLinkDownload({
    filePath,
    response,
    mimeType,
    filename,
    fileSize
}) {
    const stat = await fs.promises.stat(filePath);

    if (!stat.isFile()) {
        throw new Error("STORAGE_FILE_NOT_FOUND");
    }

    const finalSize = Number(fileSize || stat.size);

    response.statusCode = 200;

    response.setHeader(
        "Content-Type",
        mimeType || "application/octet-stream"
    );

    response.setHeader(
        "Content-Length",
        finalSize
    );

    response.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(
            filename || "download"
        )}`
    );

    response.setHeader(
        "X-Content-Type-Options",
        "nosniff"
    );

    response.setHeader(
        "Cache-Control",
        "private, no-store, max-age=0"
    );

    response.setHeader(
        "Pragma",
        "no-cache"
    );

    const readStream = fs.createReadStream(filePath);

    readStream.on("error", (error) => {
        console.error(
            "Share-link download stream error:",
            error
        );

        if (!response.headersSent) {
            response.statusCode = 500;
        }

        response.destroy(error);
    });

    await pipeline(readStream, response);
}

/**
 * Audit helper.
 *
 * Adjusted so the actual audit service remains the single
 * source of audit-log creation.
 */
export async function auditShareLinkDownload({
    userId = null,
    documentId,
    shareLinkId,
    ipAddress = null,
    userAgent = null,
    success = true,
    failureReason = null
}) {
    try {
        await createAuditLog({
            userId,
            documentId,
            action: success
                ? "download"
                : "failed_access",
            ipAddress,
            userAgent,
            metadata: {
                source: "share_link",
                shareLinkId,
                success,
                failureReason
            }
        });
    } catch (error) {
        /*
         * Do not allow an audit failure to crash the download.
         *
         * Production systems should use an outbox/retry mechanism
         * if audit durability is mandatory.
         */
        console.error(
            "Share-link audit logging failed:",
            error
        );
    }
}

export {
    hashShareToken,
    normalizeToken
};