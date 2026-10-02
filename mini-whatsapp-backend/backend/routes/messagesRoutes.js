
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

import authMiddleware from "../middleware/authMiddleware.js";

import {
    getUnreadCount,
    getPrivateMessages,
    getRecentChats,
    getMessage,

    uploadChatFile,
    uploadMultipleChatFiles,
    uploadGroupFile,
    uploadMultipleGroupFiles,

    pinMessage,
    unpinMessage,

    getPrivatePinnedMessages,
    getGroupPinnedMessages,
} from "../controllers/messageController.js";

const router = express.Router();


// =====================================================
// UPLOAD DIRECTORY
// =====================================================

const uploadDir = path.resolve("uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true,
    });
}


// =====================================================
// MULTER STORAGE
// =====================================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(
            null,
            uploadDir
        );

    },

    filename: (req, file, cb) => {

        const safeName =
            file.originalname
                .replace(
                    /[^a-zA-Z0-9.-]/g,
                    "-"
                );

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(
                Math.random() * 1e9
            ) +
            "-" +
            safeName;

        cb(
            null,
            uniqueName
        );

    },

});

// MULTER INSTANCE
const upload = multer({
    storage,
    limits: {
        fileSize:
            50 * 1024 * 1024,
    },

});


// =====================================================
// UNREAD MESSAGE COUNT
// =====================================================

router.get(
    "/unread/count",
    authMiddleware,
    getUnreadCount
);

// =====================================================
// PRIVATE MESSAGE HISTORY
// =====================================================

router.get(
    "/private/:userId",
    authMiddleware,
    getPrivateMessages
);

// =====================================================
// RECENT CHATS
// =====================================================

router.get(
    "/recent",
    authMiddleware,
    getRecentChats
);

// =====================================================
// PRIVATE CHAT FILE UPLOAD
// POST
// /api/messages/upload
// IMPORTANT:
// FormData field name MUST be:
// file
// Other fields:
// receiver_id
// message_type
// =====================================================

router.post(
    "/upload",
    authMiddleware,
    upload.single("file"),
    uploadChatFile
);


router.post(
    "/upload/multiple",
    authMiddleware,
    upload.array("files", 30),
    uploadMultipleChatFiles
);

router.post(
    "/group/upload/multiple",
    authMiddleware,
    upload.array("files", 30),
    uploadMultipleGroupFiles
);

// =====================================================
// PIN MESSAGE
// POST
// /api/messages/:messageId/pin
// =====================================================

router.post(
    "/:messageId/pin",

    authMiddleware,

    pinMessage
);


// =====================================================
// UNPIN MESSAGE
// DELETE
// /api/messages/:messageId/pin
// =====================================================

router.delete(
    "/:messageId/pin",

    authMiddleware,

    unpinMessage
);


// =====================================================
// PRIVATE PINNED MESSAGES
//
// GET
// /api/messages/private/:userId/pinned
// =====================================================

router.get(
    "/private/:userId/pinned",

    authMiddleware,

    getPrivatePinnedMessages
);


// =====================================================
// ALIAS FOR FRONTEND
// Your Chat.jsx currently calls:
// /api/messages/private-pinned/:userId
// So this route is also added.
// =====================================================

router.get(
    "/private-pinned/:userId",
    authMiddleware,
    getPrivatePinnedMessages
);


// =====================================================
// GROUP PINNED MESSAGES
// GET
// /api/messages/group/:groupId/pinned
// =====================================================

router.get(
    "/group/:groupId/pinned",
    authMiddleware,
    getGroupPinnedMessages
);



// =====================================================
// GET SINGLE MESSAGE
//
// KEEP THIS LAST
// =====================================================

router.get(
    "/:id",
    authMiddleware,
    getMessage
);


export default router;

