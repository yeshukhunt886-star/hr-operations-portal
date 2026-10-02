import crypto from "node:crypto";
import db from "../config/db.js";

/*
|--------------------------------------------------------------------------
| Generate secure raw token
|--------------------------------------------------------------------------
*/
export function generateShareToken() {
  return crypto.randomBytes(32).toString("hex");
}

/*
|--------------------------------------------------------------------------
| SHA-256 hash
|--------------------------------------------------------------------------
*/
export function hashShareToken(token) {
  return crypto
    .createHash("sha256")
    .update(token, "utf8")
    .digest("hex");
}

/*
|--------------------------------------------------------------------------
| Get document owned by user
|--------------------------------------------------------------------------
*/
export async function getOwnedDocumentForToken({
  documentId,
  userId,
}) {
  const [rows] = await db.execute(
    `
    SELECT
      id,
      owner_id,
      original_filename,
      mime_type,
      file_size,
      status
    FROM documents
    WHERE id = ?
      AND owner_id = ?
    LIMIT 1
    `,
    [documentId, userId]
  );

  return rows.length > 0
    ? rows[0]
    : null;
}

/*
|--------------------------------------------------------------------------
| Create secure share token
|--------------------------------------------------------------------------
*/
export async function createDocumentShareToken({
  documentId,
  createdByUserId,
  expiresAt,
  maxUses,
}) {
  const rawToken =
    generateShareToken();

  const tokenHash =
    hashShareToken(rawToken);

  const [result] =
    await db.execute(
      `
      INSERT INTO document_share_tokens (
        document_id,
        token_hash,
        expires_at,
        max_uses,
        use_count,
        is_revoked,
        created_by_user_id
      )
      VALUES (?, ?, ?, ?, 0, 0, ?)
      `,
      [
        documentId,
        tokenHash,
        expiresAt,
        maxUses,
        createdByUserId,
      ]
    );

  return {
    id: result.insertId,
    token: rawToken,
    documentId,
    expiresAt,
    maxUses,
    useCount: 0,
    isRevoked: false,
    createdByUserId,
  };
}

/*
|--------------------------------------------------------------------------
| Find active token
|--------------------------------------------------------------------------
*/
export async function getActiveShareToken(
  token
) {
  if (
    typeof token !== "string" ||
    token.length !== 64
  ) {
    return null;
  }

  const tokenHash =
    hashShareToken(token);

  const [rows] =
    await db.execute(
      `
      SELECT
        dst.id,
        dst.document_id,
        dst.token_hash,
        dst.expires_at,
        dst.max_uses,
        dst.use_count,
        dst.is_revoked,
        dst.created_by_user_id,
        dst.created_at,
        dst.revoked_at,

        d.original_filename,
        d.mime_type,
        d.file_size,
        d.file_hash,
        d.storage_key,
        d.status

      FROM document_share_tokens dst

      INNER JOIN documents d
        ON d.id = dst.document_id

      WHERE dst.token_hash = ?

      LIMIT 1
      `,
      [tokenHash]
    );

  if (rows.length === 0) {
    return null;
  }

  const record = rows[0];

  /*
   * Revoked
   */
  if (record.is_revoked) {
    return null;
  }

  /*
   * Document deleted/inactive
   */
  if (record.status !== "active") {
    return null;
  }

  /*
   * Expired
   */
  if (
    new Date(record.expires_at) <=
    new Date()
  ) {
    return null;
  }

  /*
   * Maximum usage reached
   */
  if (
    record.max_uses !== null &&
    record.use_count >=
      record.max_uses
  ) {
    return null;
  }

  return record;
}

/*
|--------------------------------------------------------------------------
| Consume token
|--------------------------------------------------------------------------
*/
export async function consumeShareToken({
  tokenId,
}) {
  const [result] =
    await db.execute(
      `
      UPDATE document_share_tokens
      SET use_count = use_count + 1
      WHERE id = ?
        AND is_revoked = 0
        AND expires_at > NOW()
        AND (
          max_uses IS NULL
          OR use_count < max_uses
        )
      `,
      [tokenId]
    );

  return result.affectedRows > 0;
}

/*
|--------------------------------------------------------------------------
| List share links
|--------------------------------------------------------------------------
*/
export async function listDocumentShareTokens({
  documentId,
  ownerId,
}) {
  const [rows] =
    await db.execute(
      `
      SELECT
        dst.id,
        dst.document_id,
        dst.expires_at,
        dst.max_uses,
        dst.use_count,
        dst.is_revoked,
        dst.created_by_user_id,
        dst.created_at,
        dst.revoked_at
      FROM document_share_tokens dst
      INNER JOIN documents d
        ON d.id = dst.document_id
      WHERE dst.document_id = ?
        AND d.owner_id = ?
      ORDER BY dst.created_at DESC
      `,
      [
        documentId,
        ownerId,
      ]
    );

  return rows;
}

/*
|--------------------------------------------------------------------------
| Revoke share link
|--------------------------------------------------------------------------
*/
export async function revokeDocumentShareToken({
  tokenId,
  documentId,
  ownerId,
}) {
  const [result] =
    await db.execute(
      `
      UPDATE document_share_tokens dst
      INNER JOIN documents d
        ON d.id = dst.document_id
      SET
        dst.is_revoked = 1,
        dst.revoked_at = NOW()
      WHERE dst.id = ?
        AND dst.document_id = ?
        AND d.owner_id = ?
        AND dst.is_revoked = 0
      `,
      [
        tokenId,
        documentId,
        ownerId,
      ]
    );

  return result.affectedRows > 0;
}