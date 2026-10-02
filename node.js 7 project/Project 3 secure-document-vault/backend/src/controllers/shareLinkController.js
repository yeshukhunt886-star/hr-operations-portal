import {
  createShareLink,
  getShareLinks,
  revokeShareLink,
  resolveShareToken,
} from "../services/shareLinkService.js";

import db from "../config/db.js";

/*
|--------------------------------------------------------------------------
| POST /api/documents/:id/share-links
|--------------------------------------------------------------------------
*/

export async function createLink(req, res) {
  try {
    const documentId =
      Number(req.params.id);

    const expiresAt =
      req.body.expiresAt;

    const maxUses =
      req.body.maxUses === undefined ||
      req.body.maxUses === null ||
      req.body.maxUses === ""
        ? null
        : Number(req.body.maxUses);

    if (
      !Number.isSafeInteger(documentId) ||
      documentId <= 0
    ) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    /*
     * Validate expiration.
     */
    if (
      typeof expiresAt !== "string" ||
      Number.isNaN(
        Date.parse(expiresAt)
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid expiresAt value is required.",
      });
    }

    const expirationDate =
      new Date(expiresAt);

    if (
      expirationDate <= new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Expiration must be in the future.",
      });
    }

    /*
     * Optional maximum use count.
     */
    if (
      maxUses !== null &&
      (
        !Number.isSafeInteger(maxUses) ||
        maxUses <= 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "maxUses must be a positive integer.",
      });
    }

    const result =
      await createShareLink({
        documentId,
        userId:
          req.user.userId,
        expiresAt:
          expirationDate,
        maxUses,
      });

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    /*
     * Audit.
     */
    try {
      const connection =
        await db.getConnection();

      try {
        await connection.execute(
          `
          INSERT INTO document_audit_logs (
            user_id,
            document_id,
            action,
            success
          )
          VALUES (?, ?, 'SHARE_LINK_CREATE', 1)
          `,
          [
            req.user.userId,
            documentId,
          ]
        );
      } finally {
        connection.release();
      }
    } catch (auditError) {
      console.error(
        "Share link audit failed:",
        auditError.message
      );
    }

    return res.status(201).json({
      success: true,
      message:
        "Share link created successfully.",

      shareLink: {
        id:
          result.link.id,

        /*
         * This is the ONLY response containing
         * the raw token.
         */
        token:
          result.link.token,

        documentId:
          result.link.documentId,

        expiresAt:
          result.link.expiresAt,

        maxUses:
          result.link.maxUses,

        useCount:
          result.link.useCount,
      },
    });
  } catch (error) {
    console.error(
      "Create share link error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create share link.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| GET /api/documents/:id/share-links
|--------------------------------------------------------------------------
*/

export async function listLinks(req, res) {
  try {
    const documentId =
      Number(req.params.id);

    if (
      !Number.isSafeInteger(documentId) ||
      documentId <= 0
    ) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const links =
      await getShareLinks({
        documentId,
        userId:
          req.user.userId,
      });

    return res.status(200).json({
      success: true,
      shareLinks: links,
    });
  } catch (error) {
    console.error(
      "List share links error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch share links.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| DELETE /api/documents/:id/share-links/:linkId
|--------------------------------------------------------------------------
*/

export async function revokeLink(req, res) {
  try {
    const documentId =
      Number(req.params.id);

    const linkId =
      Number(req.params.linkId);

    if (
      !Number.isSafeInteger(documentId) ||
      documentId <= 0 ||
      !Number.isSafeInteger(linkId) ||
      linkId <= 0
    ) {
      return res.status(404).json({
        success: false,
        message: "Share link not found.",
      });
    }

    const result =
      await revokeShareLink({
        documentId,
        linkId,
        userId:
          req.user.userId,
      });

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: "Share link not found.",
      });
    }

    try {
      const connection =
        await db.getConnection();

      try {
        await connection.execute(
          `
          INSERT INTO document_audit_logs (
            user_id,
            document_id,
            action,
            success
          )
          VALUES (?, ?, 'SHARE_LINK_REVOKE', 1)
          `,
          [
            req.user.userId,
            documentId,
          ]
        );
      } finally {
        connection.release();
      }
    } catch (auditError) {
      console.error(
        "Share link revoke audit failed:",
        auditError.message
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Share link revoked successfully.",
    });
  } catch (error) {
    console.error(
      "Revoke share link error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to revoke share link.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| GET /api/share/:token
|--------------------------------------------------------------------------
*/
export async function accessShareLink(req, res) {
  try {
    const token = req.params.token;

    const result = await resolveShareToken(token);

    /*
     * Never reveal whether the token:
     * - does not exist
     * - expired
     * - was revoked
     * - reached max uses
     */
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message:
          "Share link is invalid or unavailable.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Share link is valid.",

      document: {
        id:
          result.link.documentId,

        originalFilename:
          result.link.originalFilename,

        mimeType:
          result.link.mimeType,

        fileSize:
          result.link.fileSize,

        expiresAt:
          result.link.expiresAt,

        maxUses:
          result.link.maxUses,

        useCount:
          result.link.useCount,
      },
    });
  } catch (error) {
    console.error(
      "Share link access error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to access share link.",
    });
  }
}