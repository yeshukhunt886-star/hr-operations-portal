import {
  getOwnedDocument,
  getUserById,
  getActiveShare,
  createDocumentShare,
  listDocumentShares,
  revokeDocumentShare,
} from "../services/documentShareService.js";

function parsePositiveId(value) {
  const id = Number(value);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

/*
|--------------------------------------------------------------------------
| SHARE DOCUMENT
|--------------------------------------------------------------------------
| POST /api/documents/:documentId/shares
|--------------------------------------------------------------------------
*/
export async function shareDocument(req, res) {
  try {
    const documentId = parsePositiveId(
      req.params.documentId
    );

    if (!documentId) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const {
      sharedWithUserId,
      permission,
    } = req.body;

    const targetUserId = parsePositiveId(
      sharedWithUserId
    );

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: "sharedWithUserId must be a valid user ID.",
      });
    }

    if (
      permission !== "read" &&
      permission !== "download"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Permission must be either 'read' or 'download'.",
      });
    }

    const ownerId = req.user.userId;

    /*
     * Owner check
     */
    const document = await getOwnedDocument({
      documentId,
      userId: ownerId,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message:
          "Document not found or you are not the owner.",
      });
    }

    /*
     * Cannot share with yourself
     */
    if (targetUserId === ownerId) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot share a document with yourself.",
      });
    }

    /*
     * Target user must exist
     */
    const targetUser = await getUserById(
      targetUserId
    );

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User to share with was not found.",
      });
    }

    /*
     * Target user must be active
     */
    if (!targetUser.is_active) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot share a document with an inactive user.",
      });
    }

    /*
     * Document must be active
     */
    if (document.status !== "active") {
      return res.status(400).json({
        success: false,
        message:
          "Only active documents can be shared.",
      });
    }

    /*
     * Check existing active share
     */
    const existingShare =
      await getActiveShare({
        documentId,
        sharedWithUserId: targetUserId,
      });

    if (existingShare) {
      return res.status(409).json({
        success: false,
        message:
          "Document is already shared with this user.",
        share: {
          id: existingShare.id,
          documentId:
            existingShare.document_id,
          sharedWithUserId:
            existingShare.shared_with_user_id,
          permission:
            existingShare.permission,
        },
      });
    }

    /*
     * Create share
     */
    const share =
      await createDocumentShare({
        documentId,
        sharedWithUserId: targetUserId,
        permission,
        grantedByUserId: ownerId,
      });

    return res.status(201).json({
      success: true,
      message: "Document shared successfully.",
      share: {
        id: share.id,
        documentId: share.document_id,
        sharedWithUserId:
          share.shared_with_user_id,
        permission: share.permission,
        grantedByUserId:
          share.granted_by_user_id,
        createdAt: share.created_at,
        revokedAt: share.revoked_at,
        sharedWithName:
          share.shared_with_name,
        sharedWithEmail:
          share.shared_with_email,
      },
    });
  } catch (error) {
    console.error(
      "Share document error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to share document.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| LIST SHARES
|--------------------------------------------------------------------------
| GET /api/documents/:documentId/shares
|--------------------------------------------------------------------------
*/
export async function listShares(req, res) {
  try {
    const documentId = parsePositiveId(
      req.params.documentId
    );

    if (!documentId) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const ownerId = req.user.userId;

    /*
     * Verify ownership
     */
    const document = await getOwnedDocument({
      documentId,
      userId: ownerId,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message:
          "Document not found or you are not the owner.",
      });
    }

    const shares =
      await listDocumentShares({
        documentId,
        ownerId,
      });

    return res.status(200).json({
      success: true,
      message:
        "Document shares fetched successfully.",
      shares,
    });
  } catch (error) {
    console.error(
      "List document shares error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch document shares.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| REVOKE SHARE
|--------------------------------------------------------------------------
| DELETE /api/documents/:documentId/shares/:shareId
|--------------------------------------------------------------------------
*/
export async function revokeShare(req, res) {
  try {
    const documentId = parsePositiveId(
      req.params.documentId
    );

    const shareId = parsePositiveId(
      req.params.shareId
    );

    if (!documentId || !shareId) {
      return res.status(404).json({
        success: false,
        message: "Share not found.",
      });
    }

    const ownerId = req.user.userId;

    /*
     * Verify document ownership
     */
    const document = await getOwnedDocument({
      documentId,
      userId: ownerId,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message:
          "Document not found or you are not the owner.",
      });
    }

    /*
     * Revoke share
     */
    const revoked =
      await revokeDocumentShare({
        shareId,
        documentId,
        ownerId,
      });

    if (!revoked) {
      return res.status(404).json({
        success: false,
        message:
          "Active document share not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Document share revoked successfully.",
    });
  } catch (error) {
    console.error(
      "Revoke document share error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to revoke document share.",
    });
  }
}