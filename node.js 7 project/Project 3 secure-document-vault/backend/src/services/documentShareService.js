import db from "../config/db.js";

// ==========================================
// GET OWNED DOCUMENT
// ==========================================

export async function getOwnedDocument({
  documentId,
  userId,
}) {
  const [rows] = await db.execute(
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

  return rows.length > 0
    ? rows[0]
    : null;
}

// ==========================================
// GET USER
// ==========================================

export async function getUserById(
  userId
) {
  const [rows] = await db.execute(
    `
    SELECT
      id,
      name,
      email,
      role,
      is_active
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [userId]
  );

  return rows.length > 0
    ? rows[0]
    : null;
}

// ==========================================
// GET ACTIVE SHARE
// ==========================================

export async function getActiveShare({
  documentId,
  sharedWithUserId,
}) {
  const [rows] = await db.execute(
    `
    SELECT
      id,
      document_id,
      shared_with_user_id,
      permission,
      granted_by_user_id,
      created_at,
      revoked_at
    FROM document_shares
    WHERE document_id = ?
      AND shared_with_user_id = ?
      AND revoked_at IS NULL
    LIMIT 1
    `,
    [
      documentId,
      sharedWithUserId,
    ]
  );

  return rows.length > 0
    ? rows[0]
    : null;
}

// ==========================================
// CREATE SHARE
// ==========================================

export async function createDocumentShare({
  documentId,
  sharedWithUserId,
  permission,
  grantedByUserId,
}) {
  const [result] = await db.execute(
    `
    INSERT INTO document_shares (
      document_id,
      shared_with_user_id,
      permission,
      granted_by_user_id
    )
    VALUES (?, ?, ?, ?)
    `,
    [
      documentId,
      sharedWithUserId,
      permission,
      grantedByUserId,
    ]
  );

  const [rows] = await db.execute(
    `
    SELECT
      ds.id,
      ds.document_id,
      ds.shared_with_user_id,
      ds.permission,
      ds.granted_by_user_id,
      ds.created_at,
      ds.revoked_at,
      u.name AS shared_with_name,
      u.email AS shared_with_email
    FROM document_shares ds
    INNER JOIN users u
      ON u.id = ds.shared_with_user_id
    WHERE ds.id = ?
    LIMIT 1
    `,
    [result.insertId]
  );

  return rows[0];
}

// ==========================================
// LIST SHARES
// ==========================================

export async function listDocumentShares({
  documentId,
  ownerId,
}) {
  const [rows] = await db.execute(
    `
    SELECT
      ds.id,
      ds.document_id,
      ds.shared_with_user_id,
      ds.permission,
      ds.granted_by_user_id,
      ds.created_at,
      ds.revoked_at,
      u.name AS shared_with_name,
      u.email AS shared_with_email
    FROM document_shares ds
    INNER JOIN users u
      ON u.id = ds.shared_with_user_id
    INNER JOIN documents d
      ON d.id = ds.document_id
    WHERE ds.document_id = ?
      AND d.owner_id = ?
      AND ds.revoked_at IS NULL
    ORDER BY ds.created_at DESC
    `,
    [
      documentId,
      ownerId,
    ]
  );

  return rows;
}

// ==========================================
// REVOKE SHARE
// ==========================================

export async function revokeDocumentShare({
  shareId,
  documentId,
  ownerId,
}) {
  const [result] = await db.execute(
    `
    UPDATE document_shares ds
    INNER JOIN documents d
      ON d.id = ds.document_id
    SET ds.revoked_at = NOW()
    WHERE ds.id = ?
      AND ds.document_id = ?
      AND d.owner_id = ?
      AND ds.revoked_at IS NULL
    `,
    [
      shareId,
      documentId,
      ownerId,
    ]
  );

  return result.affectedRows > 0;
}

// ==========================================
// GET DOCUMENT ACCESS
// ==========================================
export async function getDocumentAccess({
  documentId,
  userId,
  requiredPermission = "read",
}) {
  /*
   * ---------------------------------------------------------
   * 1. OWNER ACCESS
   * ---------------------------------------------------------
   */
  const [ownerRows] = await db.execute(
    `
    SELECT
      id,
      owner_id,
      status
    FROM documents
    WHERE id = ?
      AND owner_id = ?
    LIMIT 1
    `,
    [documentId, userId]
  );

  if (ownerRows.length > 0) {
    const document = ownerRows[0];

    if (document.status !== "active") {
      return {
        allowed: false,
        reason: "DOCUMENT_NOT_ACTIVE",
      };
    }

    return {
      allowed: true,
      role: "owner",
      permission: "owner",
    };
  }

  /*
   * ---------------------------------------------------------
   * 2. SHARED USER ACCESS
   *
   * IMPORTANT:
   * revoked_at IS NULL is checked EVERY request.
   * ---------------------------------------------------------
   */
  const [shareRows] = await db.execute(
    `
    SELECT
      ds.id AS share_id,
      ds.document_id,
      ds.shared_with_user_id,
      ds.permission,
      ds.revoked_at,

      d.status AS document_status,

      u.status AS user_status

    FROM document_shares ds

    INNER JOIN documents d
      ON d.id = ds.document_id

    INNER JOIN users u
      ON u.id = ds.shared_with_user_id

    WHERE ds.document_id = ?
      AND ds.shared_with_user_id = ?
      AND ds.revoked_at IS NULL

    LIMIT 1
    `,
    [documentId, userId]
  );

  if (shareRows.length === 0) {
    return {
      allowed: false,
      reason: "NO_ACTIVE_SHARE",
    };
  }

  const share = shareRows[0];

  /*
   * Document deleted/inactive.
   */
  if (share.document_status !== "active") {
    return {
      allowed: false,
      reason: "DOCUMENT_NOT_ACTIVE",
    };
  }

  /*
   * Recipient account inactive.
   */
  if (share.user_status !== "active") {
    return {
      allowed: false,
      reason: "USER_INACTIVE",
    };
  }

  /*
   * ---------------------------------------------------------
   * READ ACCESS
   * ---------------------------------------------------------
   */
  if (requiredPermission === "read") {
    return {
      allowed: true,
      role: "shared",
      permission: share.permission,
      shareId: share.share_id,
    };
  }

  /*
   * ---------------------------------------------------------
   * DOWNLOAD ACCESS
   * ---------------------------------------------------------
   */
  if (requiredPermission === "download") {
    if (share.permission !== "download") {
      return {
        allowed: false,
        reason: "DOWNLOAD_NOT_ALLOWED",
      };
    }

    return {
      allowed: true,
      role: "shared",
      permission: "download",
      shareId: share.share_id,
    };
  }

  return {
    allowed: false,
    reason: "UNKNOWN_PERMISSION",
  };
}

// ==========================================
// DOWNLOAD ACCESS
// ==========================================

export async function hasDownloadAccess({
  documentId,
  userId,
}) {
  const [rows] = await db.execute(
    `
    SELECT
      d.id,
      d.owner_id,
      ds.permission
    FROM documents d
    LEFT JOIN document_shares ds
      ON ds.document_id = d.id
      AND ds.shared_with_user_id = ?
      AND ds.revoked_at IS NULL
    WHERE d.id = ?
      AND d.status = 'active'
      AND (
        d.owner_id = ?
        OR ds.permission = 'download'
      )
    LIMIT 1
    `,
    [
      userId,
      documentId,
      userId,
    ]
  );

  return rows.length > 0
    ? rows[0]
    : null;
}