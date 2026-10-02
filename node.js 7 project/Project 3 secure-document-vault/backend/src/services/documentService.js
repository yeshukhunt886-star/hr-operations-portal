import fs from "node:fs";
import path from "node:path";

import db from "../config/db.js";

import {
  storageKeyToAbsolutePath,
} from "./storageService.js";

/*
|--------------------------------------------------------------------------
| Allowed sorting fields
|--------------------------------------------------------------------------
*/

const SORT_FIELDS = {
  created_at: "d.created_at",
  updated_at: "d.updated_at",
  original_filename: "d.original_filename",
  file_size: "d.file_size",
  category: "d.category",
};

/*
|--------------------------------------------------------------------------
| Get documents
|--------------------------------------------------------------------------
*/

export async function getDocuments({
  userId,
  search,
  category,
  status,
  sortBy,
  sortOrder,
  page,
  limit,
}) {
  const conditions = [
    "d.owner_id = ?",
  ];

  const params = [userId];

  /*
   * Search
   */
  if (
    search &&
    String(search).trim()
  ) {
    conditions.push(
      `
      (
        d.original_filename LIKE ?
        OR d.category LIKE ?
        OR d.description LIKE ?
      )
      `
    );

    const searchValue =
      `%${String(search).trim()}%`;

    params.push(
      searchValue,
      searchValue,
      searchValue
    );
  }

  /*
   * Category
   */
  if (
    category &&
    String(category).trim()
  ) {
    conditions.push(
      "d.category = ?"
    );

    params.push(
      String(category).trim()
    );
  }

  /*
   * Status
   */
  if (
    status &&
    ["active", "deleted"].includes(
      String(status)
    )
  ) {
    conditions.push(
      "d.status = ?"
    );

    params.push(
      String(status)
    );
  } else {
    /*
     * By default users see active
     * documents only.
     */
    conditions.push(
      "d.status = 'active'"
    );
  }

  const whereClause =
    conditions.join(" AND ");

  /*
   * Count
   */
  const countSql = `
    SELECT COUNT(*) AS total
    FROM documents d
    WHERE ${whereClause}
  `;

  const [countRows] =
    await db.execute(
      countSql,
      params
    );

  const total =
    Number(countRows[0].total);

  /*
   * Pagination
   */
  const safePage =
    Math.max(
      1,
      Number(page) || 1
    );

  const safeLimit =
    Math.min(
      100,
      Math.max(
        1,
        Number(limit) || 20
      )
    );

  const offset =
    (safePage - 1) *
    safeLimit;

  /*
   * Sorting
   */
  const safeSortBy =
    SORT_FIELDS[sortBy] ||
    SORT_FIELDS.created_at;

  const safeSortOrder =
    String(sortOrder).toLowerCase() ===
    "asc"
      ? "ASC"
      : "DESC";

  const documentsSql = `
    SELECT
      d.id,
      d.owner_id,
      d.original_filename,
      d.mime_type,
      d.file_size,
      d.file_hash,
      d.category,
      d.description,
      d.status,
      d.created_at,
      d.updated_at,
      d.deleted_at
    FROM documents d
    WHERE ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;

  const [rows] =
    await db.execute(
      documentsSql,
      [
        ...params,
        safeLimit,
        offset,
      ]
    );

  return {
    documents: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages:
        Math.ceil(
          total / safeLimit
        ),
    },
  };
}

// Get one document
export async function getDocumentById({
  documentId,
  userId,
}) {
  const [rows] = await db.execute(
    `
    SELECT
      d.id,
      d.owner_id,
      d.original_filename,
      d.mime_type,
      d.file_size,
      d.file_hash,
      d.storage_key,
      d.category,
      d.description,
      d.status,
      d.created_at,
      d.updated_at,

      CASE
        WHEN d.owner_id = ? THEN 'owner'
        WHEN ds.permission = 'download'
          THEN 'download'
        WHEN ds.permission = 'read'
          THEN 'read'
        ELSE NULL
      END AS access_level

    FROM documents d

    LEFT JOIN document_shares ds
      ON ds.document_id = d.id
      AND ds.shared_with_user_id = ?
      AND ds.revoked_at IS NULL

    WHERE d.id = ?
      AND (
        d.owner_id = ?
        OR ds.id IS NOT NULL
      )

    LIMIT 1
    `,
    [
      userId,
      userId,
      documentId,
      userId,
    ]
  );

  return rows.length > 0
    ? rows[0]
    : null;
}

/*
|--------------------------------------------------------------------------
| Update metadata
|--------------------------------------------------------------------------
*/

export async function updateDocumentMetadata({
  documentId,
  userId,
  category,
  description,
}) {
  /*
   * First verify ownership.
   */
  const document =
    await getDocumentById({
      documentId,
      userId,
      includeDeleted: false,
    });

  if (!document) {
    return null;
  }

  const updates = [];
  const params = [];

  if (
    category !== undefined
  ) {
    let normalizedCategory =
      category === null
        ? null
        : String(category)
            .trim();

    if (
      normalizedCategory &&
      normalizedCategory.length > 100
    ) {
      normalizedCategory =
        normalizedCategory.slice(
          0,
          100
        );
    }

    updates.push(
      "category = ?"
    );

    params.push(
      normalizedCategory || null
    );
  }

  if (
    description !== undefined
  ) {
    let normalizedDescription =
      description === null
        ? null
        : String(description)
            .trim();

    if (
      normalizedDescription &&
      normalizedDescription.length >
        500
    ) {
      normalizedDescription =
        normalizedDescription.slice(
          0,
          500
        );
    }

    updates.push(
      "description = ?"
    );

    params.push(
      normalizedDescription || null
    );
  }

  if (updates.length === 0) {
    return document;
  }

  updates.push(
    "updated_at = CURRENT_TIMESTAMP"
  );

  params.push(
    documentId,
    userId
  );

  await db.execute(
    `
    UPDATE documents
    SET ${updates.join(", ")}
    WHERE id = ?
      AND owner_id = ?
      AND status = 'active'
    `,
    params
  );

  return getDocumentById({
    documentId,
    userId,
    includeDeleted: false,
  });
}

/*
|--------------------------------------------------------------------------
| Soft delete
|--------------------------------------------------------------------------
*/

export async function softDeleteDocument({
  documentId,
  userId,
}) {
  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();

    const [
      documents,
    ] = await connection.execute(
      `
      SELECT
        id,
        owner_id,
        original_filename,
        status
      FROM documents
      WHERE id = ?
        AND owner_id = ?
      LIMIT 1
      `,
      [
        documentId,
        userId,
      ]
    );

    if (
      documents.length === 0
    ) {
      await connection.rollback();

      return {
        found: false,
        alreadyDeleted: false,
      };
    }

    const document =
      documents[0];

    if (
      document.status ===
      "deleted"
    ) {
      await connection.rollback();

      return {
        found: true,
        alreadyDeleted: true,
      };
    }

    await connection.execute(
      `
      UPDATE documents
      SET
        status = 'deleted',
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND owner_id = ?
        AND status = 'active'
      `,
      [
        documentId,
        userId,
      ]
    );

    await createAuditLog(
      connection,
      {
        userId,
        documentId,
        action: "DELETE",
        success: true,
      }
    );

    await connection.commit();

    return {
      found: true,
      alreadyDeleted: false,
      document,
    };
  } catch (error) {
    await connection.rollback();

    throw error;
  } finally {
    connection.release();
  }
}

/*
|--------------------------------------------------------------------------
| Restore
|--------------------------------------------------------------------------
*/

export async function restoreDocument({
  documentId,
  userId,
}) {
  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();

    const [
      documents,
    ] = await connection.execute(
      `
      SELECT
        id,
        owner_id,
        original_filename,
        storage_key,
        status
      FROM documents
      WHERE id = ?
        AND owner_id = ?
      LIMIT 1
      `,
      [
        documentId,
        userId,
      ]
    );

    if (
      documents.length === 0
    ) {
      await connection.rollback();

      return {
        found: false,
        restored: false,
      };
    }

    const document =
      documents[0];

    if (
      document.status ===
      "active"
    ) {
      await connection.rollback();

      return {
        found: true,
        restored: false,
        alreadyActive: true,
      };
    }

    /*
     * Before restoring, verify that
     * physical storage still exists.
     */
    let storageExists = false;

    try {
      const absolutePath =
        storageKeyToAbsolutePath(
          document.storage_key
        );

      const stats =
        await fs.promises.stat(
          absolutePath
        );

      storageExists =
        stats.isFile();
    } catch {
      storageExists = false;
    }

    if (!storageExists) {
      await connection.rollback();

      return {
        found: true,
        restored: false,
        storageMissing: true,
      };
    }

    await connection.execute(
      `
      UPDATE documents
      SET
        status = 'active',
        deleted_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND owner_id = ?
        AND status = 'deleted'
      `,
      [
        documentId,
        userId,
      ]
    );

    await createAuditLog(
      connection,
      {
        userId,
        documentId,
        action: "RESTORE",
        success: true,
      }
    );

    await connection.commit();

    return {
      found: true,
      restored: true,
      document,
    };
  } catch (error) {
    await connection.rollback();

    throw error;
  } finally {
    connection.release();
  }
}

/*
|--------------------------------------------------------------------------
| Download authorization
|--------------------------------------------------------------------------
*/

export async function getDownloadableDocument({
  documentId,
  userId,
}) {
  const document =
    await getDocumentById({
      documentId,
      userId,
      includeDeleted: false,
    });

  if (!document) {
    return null;
  }

  /*
   * Resolve storage path only on the
   * server.
   */
  let absolutePath;

  try {
    absolutePath =
      storageKeyToAbsolutePath(
        document.storage_key
      );
  } catch {
    return {
      ...document,
      storageInvalid: true,
    };
  }

  try {
    const stats =
      await fs.promises.stat(
        absolutePath
      );

    if (!stats.isFile()) {
      return {
        ...document,
        storageMissing: true,
      };
    }

    /*
     * Verify physical size against DB.
     */
    if (
      Number(stats.size) !==
      Number(document.file_size)
    ) {
      return {
        ...document,
        storageCorrupted: true,
      };
    }

    return {
      ...document,
      absolutePath,
      storageReady: true,
    };
  } catch {
    return {
      ...document,
      storageMissing: true,
    };
  }
}

/*
|--------------------------------------------------------------------------
| Audit
|--------------------------------------------------------------------------
*/

async function createAuditLog(
  connection,
  {
    userId,
    documentId,
    action,
    success,
  }
) {
  await connection.execute(
    `
    INSERT INTO document_audit_logs (
      user_id,
      document_id,
      action,
      success
    )
    VALUES (?, ?, ?, ?)
    `,
    [
      userId,
      documentId,
      action,
      success ? 1 : 0,
    ]
  );
}

export {
  createAuditLog,
};