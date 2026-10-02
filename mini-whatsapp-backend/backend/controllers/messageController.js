import db from "../config/db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// PRIVATE CHAT FILE UPLOAD
// POST /api/messages/upload
export const uploadChatFile = async (req, res) => {
    try {
        console.log("========== CHAT FILE UPLOAD ==========");
        console.log("REQ USER:",req.user);
        console.log("REQ BODY:",req.body);
        console.log("REQ FILE:",req.file);

        // CHECK AUTHENTICATED USER
        const senderId = Number(
            req.user?.id ||
            req.user?.userId ||
            req.user?.user_id
        );

        if (
            !senderId ||
            !Number.isInteger(senderId) ||
            senderId <= 0
        ) {
            return res.status(401).json({
                success: false,
                message:"Valid sender ID is required",
            });
        }

        // CHECK FILE
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message:"File is required",
            });
        }

        // GET RECEIVER ID
        const receiverId = Number(
            req.body?.receiver_id
        );

        console.log(
            "SENDER ID:",senderId
        );

        console.log(
            "RECEIVER ID:",receiverId
        );

        if (
            !receiverId ||
            !Number.isInteger(receiverId) ||
            receiverId <= 0
        ) {
            // Delete uploaded file if receiver is invalid
            if (
                req.file?.path &&
                fs.existsSync(
                    req.file.path
                )
            ) {
                fs.unlinkSync(
                    req.file.path
                );
            }

            return res.status(400).json({
                success: false,
                message:"Valid Receiver ID is required",
            });
        }

        // PREVENT SELF MESSAGE
        if (senderId === receiverId)
        {
            return res.status(400).json({
                success: false,
                message:"Cannot send file to yourself",
            });
        }


        // MESSAGE TYPE
        let messageType =
            req.body?.message_type ||
            "file";

        // FILE INFORMATION
        const fileName =
            req.file.originalname;

        const fileUrl =
            `/uploads/${req.file.filename}`;

        console.log("FILE NAME:",fileName);
        console.log("FILE URL:",fileUrl);
        console.log("MESSAGE TYPE:",messageType);

        // CHECK RECEIVER EXISTS
        const [receiverRows] =
            await db.query(
                `
                SELECT
                    id,
                    username
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [receiverId]
            );

        if (
            receiverRows.length === 0
        ) {
            // Delete uploaded file
            if (
                req.file?.path &&
                fs.existsSync(
                    req.file.path
                )
            ) {
                fs.unlinkSync(
                    req.file.path
                );
            }

            return res.status(404).json({
                success: false,
                message:"Receiver user not found",
            });
        }

        // INSERT MESSAGE
        const [result] =
            await db.execute(
                `
                INSERT INTO messages
                (sender_id,receiver_id,message,message_type,file_url,file_name,chat_type,created_at)
                VALUES
                (?,?,?,?,?,?,'private',NOW())
                `,
                [
                    senderId,
                    receiverId,
                    fileName,
                    messageType,
                    fileUrl,
                    fileName,
                ]
            );

        // GET SAVED MESSAGE
        const [rows] =
            await db.query(

                `
                SELECT
                    m.id,
                    m.sender_id,
                    m.receiver_id,
                    m.message,
                    m.message_type,
                    m.file_url,
                    m.file_name,
                    m.chat_type,
                    m.created_at,

                    sender.username
                        AS sender_username,

                    receiver.username
                        AS receiver_username

                FROM messages m

                LEFT JOIN users sender
                    ON sender.id =
                       m.sender_id

                LEFT JOIN users receiver
                    ON receiver.id =
                       m.receiver_id

                WHERE m.id = ?
                LIMIT 1
                `,
                [result.insertId]
            );

        const savedMessage =
            rows[0];

        console.log(
            "PRIVATE FILE MESSAGE SAVED:",
            savedMessage
        );


        // SUCCESS RESPONSE
        return res.status(201).json({
            success: true,
            message:savedMessage,
        });


    } catch (error) {
        console.error(
            "UPLOAD CHAT FILE ERROR:",error
        );

        // DELETE UPLOADED FILE ON ERROR
        try {
            if (
                req.file?.path &&
                fs.existsSync(
                    req.file.path
                )
            ) {
                fs.unlinkSync(
                    req.file.path
                );
            }

        } catch (
            deleteError
        ) {
            console.error(
                "FAILED TO DELETE FILE:",deleteError
            );
        }

        return res.status(500).json({
            success: false,
            message:"File upload failed",
            error:error.message,
        });
    }

};


// console.log("Loaded messageController.js");
// PRIVATE CHAT HISTORY WITH PAGINATION
// GET /api/messages/:userId?page=1&limit=20
export const getPrivateHistory = async (req, res) => {
    try {
        const senderId = Number(
            req.query.senderId
        );

        const receiverId = Number(
            req.query.receiverId
        );

        const page = Math.max(
            Number(req.query.page) || 1,
            1
        );

        const limit = Math.min(
            Number(req.query.limit) || 20,
            100
        );

        const offset =
            (page - 1) * limit;

        console.log(
            "GET PRIVATE HISTORY:",
            {
                senderId,
                receiverId,
                page,
                limit,
                offset,
            }
        );

        if (
            !Number.isInteger(senderId) ||
            !Number.isInteger(receiverId)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid senderId and receiverId are required",
            });
        }

        const [messages] =
            await db.query(
                `
                SELECT
                    id,
                    sender_id,
                    receiver_id,
                    message,
                    message_type,
                    file_url,
                    created_at
                FROM messages
                WHERE
                    (
                        sender_id = ?
                        AND receiver_id = ?
                    )
                    OR
                    (
                        sender_id = ?
                        AND receiver_id = ?
                    )
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                `,
                [
                    senderId,
                    receiverId,
                    receiverId,
                    senderId,
                    limit,
                    offset,
                ]
            );

        return res.status(200).json({
            success: true,
            messages: messages.reverse(),
            pagination: {
                page,
                limit,
                offset,
                hasMore:messages.length === limit,
            },
        });

    } catch (error) {
        console.error(
            "GET PRIVATE HISTORY ERROR:",error
        );

        return res.status(500).json({
            success: false,
            message:"Failed to fetch private message history",
        });
    }
};

// PRIVATE MESSAGES
// GET /api/messages/private/:userId?page=1&limit=20

export const getPrivateMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const { userId: otherUserId } = req.params;

        const [messages] = await db.query(
            `
            SELECT
                m.id,
                m.sender_id,
                m.receiver_id,
                m.message,
                m.message_type,
                m.file_url,
                m.reply_to_message_id,
                m.created_at,

                rm.message AS reply_message,
                rm.sender_id AS reply_sender_id

            FROM messages m

            LEFT JOIN messages rm
                ON m.reply_to_message_id = rm.id

            WHERE
                (
                    m.sender_id = ?
                    AND m.receiver_id = ?
                )
                OR
                (
                    m.sender_id = ?
                    AND m.receiver_id = ?
                )

            ORDER BY m.created_at ASC
            `,
            [
                userId,
                otherUserId,
                otherUserId,
                userId
            ]
        );

        res.status(200).json({
            success: true,
            messages
        });

    } catch (error) {
        console.error("GET PRIVATE MESSAGES ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load messages"
        });
    }
};

// RECENT CHATS
export const getRecentChats = async (req, res) => {
    try {
        const userId = req.user.id;

        const [rows] = await db.query(
            `
            SELECT *
            FROM messages
            WHERE sender_id = ?
            OR receiver_id = ?
            ORDER BY created_at DESC
            `,
            [
                userId,
                userId
            ]
        );

        res.json({
            success: true,
            total: rows.length,
            messages: rows
        });

    } catch (err) {
        console.error(
            "Get Recent Chats Error:",err
        );

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};


// GET SINGLE MESSAGE
// GET /api/messages/message/:id
export const getMessage = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const [rows] = await db.query(
            `
            SELECT *
            FROM messages
            WHERE id = ?
            `,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            });
        }

        res.json({
            success: true,
            message: rows[0]
        });

    } catch (err) {
        console.error(
            "Get Message Error:",err
        );

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};


// GET UNREAD MESSAGE COUNT
// GET /api/messages/unread
export const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await db.query(
            `
            SELECT
                sender_id,
                COUNT(*) AS unread

            FROM messages

            WHERE receiver_id = ?
            AND is_read = 0

            GROUP BY sender_id
            `,
            [userId]
        );

        res.json({
            success: true,
            unread: rows
        });

    } catch (err) {
        console.error(
            "Get Unread Count Error:",err
        );

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};



// =====================================================
// UPLOAD GROUP FILE
// ANY LOGGED-IN USER CAN UPLOAD
// IMAGE / VIDEO / TXT / DOCUMENT
// =====================================================

export const uploadGroupFile = async (
    req,
    res
) => {
    try {
        console.log("========== GROUP FILE UPLOAD ==========");
        console.log("BODY:",req.body);
        console.log("FILE:",req.file);
        console.log("AUTH USER:",req.user);

        // ==========================================
        // 1. AUTH USER
        // ==========================================

        const senderId =
            Number(req.user?.id);

        if (
            !Number.isInteger(senderId) ||
            senderId <= 0
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "User authentication required",
            });
        }

        // ==========================================
        // 2. GROUP ID
        // ==========================================

        const groupId =
            Number(req.body?.groupId);

        if (
            !Number.isInteger(groupId) ||
            groupId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid Group ID is required",
            });
        }

        // ==========================================
        // 3. FILE
        // ==========================================

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message:
                    "File is required",
            });
        }

        // ==========================================
        // 4. CHECK GROUP EXISTS
        // ==========================================

        const [
            groups
        ] = await db.query(
            `
            SELECT
                id,
                group_name,
                created_by
            FROM groups
            WHERE id = ?
            LIMIT 1
            `,
            [groupId]
        );

        if (
            groups.length === 0
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Group not found",
            });
        }

        // ==========================================
        // 5. CHECK GROUP MEMBERSHIP
        // ==========================================

        const [
            members
        ] = await db.query(
            `
            SELECT id
            FROM group_members
            WHERE group_id = ?
            AND user_id = ?
            LIMIT 1
            `,
            [
                groupId,
                senderId,
            ]
        );

        if (
            members.length === 0
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not a member of this group",
            });
        }

        // ==========================================
        // 6. FILE INFORMATION
        // ==========================================

        const fileName =
            req.file.originalname;

        const fileType =
            req.file.mimetype;

        const fileUrl =
            `/uploads/${req.file.filename}`;

        // ==========================================
        // 7. MESSAGE TYPE
        // ==========================================

        let messageType =
            req.body?.messageType ||
            "document";

        // Automatically detect image
        if (
            fileType.startsWith(
                "image/"
            )
        ) {
            messageType = "image";
        }

        // Automatically detect video
        else if (
            fileType.startsWith(
                "video/"
            )
        ) {
            messageType = "video";
        }

        // Text files
        else if (
            fileType ===
            "text/plain"
        ) {
            messageType = "document";
        }

        console.log(
            "GROUP FILE DATA:",
            {
                senderId,
                groupId,
                fileName,
                fileType,
                fileUrl,
                messageType,
            }
        );

        // ==========================================
        // 8. INSERT GROUP MESSAGE
        // ==========================================

        const [
            result
        ] = await db.query(
            `
            INSERT INTO group_messages
            (
                group_id,
                sender_id,
                message,
                message_type,
                file_url,
                file_name
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                groupId,
                senderId,
                fileName,
                messageType,
                fileUrl,
                fileName,
            ]
        );

        // ==========================================
        // 9. GET SAVED MESSAGE
        // ==========================================

        const [
            savedMessages
        ] = await db.query(
            `
            SELECT
                gm.*,
                u.username
            FROM group_messages gm
            LEFT JOIN users u
                ON gm.sender_id = u.id
            WHERE gm.id = ?
            LIMIT 1
            `,
            [
                result.insertId,
            ]
        );

        const savedMessage =
            savedMessages[0];

        console.log(
            "GROUP FILE MESSAGE SAVED:",
            savedMessage
        );

        // ==========================================
        // 10. SUCCESS
        // ==========================================

        return res.status(201).json({
            success: true,
            message:
                "Group file uploaded successfully",
            data:
                savedMessage,
        });

    } catch (error) {

        console.error(
            "UPLOAD GROUP FILE ERROR:",
            error
        );

        // Delete uploaded file
        try {
            if (
                req.file?.path &&
                fs.existsSync(
                    req.file.path
                )
            ) {
                fs.unlinkSync(
                    req.file.path
                );
            }
        } catch (
            deleteError
        ) {
            console.error(
                "FAILED TO DELETE FILE:",
                deleteError
            );
        }

        return res.status(500).json({
            success: false,
            message:
                "Failed to upload group file",
            error:
                error.message,
        });
    }
};


export const uploadMultipleChatFiles = async (
    req,
    res
) => {

    try {

        const io = req.app.get("io");

        const senderId = Number(req.user.id);
        const receiverId = Number(req.body.receiverId);

        const files = req.files || [];

        if (!files.length) {

            return res.status(400).json({
                success: false,
                message: "No files selected"
            });

        }

        const uploadedMessages = [];

        for (const file of files) {

            let messageType = "file";

            if (file.mimetype.startsWith("image/")) {
                messageType = "image";
            }
            else if (file.mimetype.startsWith("video/")) {
                messageType = "video";
            }

            const fileUrl = `/uploads/${file.filename}`;

            const [result] = await db.query(
                `
                INSERT INTO messages
                (
                    sender_id,
                    receiver_id,
                    chat_type,
                    message,
                    message_type,
                    file_url,
                    created_at
                )
                VALUES
                (
                    ?, ?, 'private', ?, ?, ?, NOW()
                )
                `,
                [
                    senderId,
                    receiverId,
                    file.originalname,
                    messageType,
                    fileUrl
                ]
            );

            const message = {
                id: result.insertId,
                sender_id: senderId,
                receiver_id: receiverId,
                chat_type: "private",
                message: file.originalname,
                message_type: messageType,
                file_url: fileUrl,
                file_name: file.originalname,
                created_at: new Date(),
                status: "sent"
            };

            uploadedMessages.push(message);

            io.to(`user_${senderId}`).emit(
                "privateMedia",
                message
            );

            io.to(`user_${receiverId}`).emit(
                "privateMedia",
                message
            );

        }

        return res.status(201).json({

            success: true,
            messages: uploadedMessages

        });

    }
    catch (error) {

        console.log(error);

        return res.status(500).json({

            success: false,
            message: "Upload failed"

        });

    }

};

export const uploadMultipleGroupFiles = async (req, res) => {
    try {

        const senderId = Number(req.user.id);
        const groupId = Number(req.body.groupId);

        const files = req.files || [];

        if (!senderId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required"
            });
        }

        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: "Valid Group ID is required"
            });
        }

        if (!files.length) {
            return res.status(400).json({
                success: false,
                message: "No files selected"
            });
        }

        // Check group exists
        const [groups] = await db.query(
            `
            SELECT id
            FROM groups
            WHERE id = ?
            LIMIT 1
            `,
            [groupId]
        );

        if (!groups.length) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        // Check membership
        const [members] = await db.query(
            `
            SELECT id
            FROM group_members
            WHERE group_id = ?
            AND user_id = ?
            LIMIT 1
            `,
            [
                groupId,
                senderId
            ]
        );

        if (!members.length) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this group"
            });
        }

        const uploadedMessages = [];

        for (const file of files) {

            let messageType = "document";

            if (file.mimetype.startsWith("image/")) {
                messageType = "image";
            }
            else if (file.mimetype.startsWith("video/")) {
                messageType = "video";
            }
            else if (file.mimetype.startsWith("audio/")) {
                messageType = "audio";
            }

            const fileUrl = `/uploads/${file.filename}`;

            const [result] = await db.query(
                `
                INSERT INTO group_messages
                (
                    group_id,
                    sender_id,
                    message,
                    message_type,
                    file_url,
                    file_name
                )
                VALUES
                (?, ?, ?, ?, ?, ?)
                `,
                [
                    groupId,
                    senderId,
                    file.originalname,
                    messageType,
                    fileUrl,
                    file.originalname
                ]
            );

            const [rows] = await db.query(
                `
                SELECT
                    gm.*,
                    u.username
                FROM group_messages gm
                LEFT JOIN users u
                    ON gm.sender_id = u.id
                WHERE gm.id = ?
                LIMIT 1
                `,
                [result.insertId]
            );

            uploadedMessages.push(rows[0]);
        }

        return res.status(201).json({
            success: true,
            messages: uploadedMessages
        });

    }
    catch (error) {

        console.error(
            "MULTIPLE GROUP FILE UPLOAD ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to upload group files",
            error: error.message
        });

    }
};



// Pin Messages
export const pinMessage = async (req, res) => {
    try {
        const userId = Number(req.user.id);

        const messageId = Number(
            req.params.messageId ||
            req.body.messageId
        );

        if (!userId || !messageId) {
            return res.status(400).json({
                success: false,
                message:"Invalid user ID or message ID",
            });
        }

        // GET MESSAGE
        const [messageRows] = await db.query(
            `
            SELECT
                id,
                sender_id,
                receiver_id,
                group_id,
                chat_type
            FROM messages
            WHERE id = ?
            LIMIT 1
            `,
            [messageId]
        );

        if (!messageRows.length) {
            return res.status(404).json({
                success: false,
                message:"Message not found",
            });
        }

        const message = messageRows[0];

        // DETERMINE GROUP ID
        const groupId =
            message.group_id
                ? Number(message.group_id)
                : null;

        // DETERMINE CHAT TYPE
        const chatType =
            groupId
                ? "group"
                : "private";

        // CHECK USER EXISTS
        const [userRows] = await db.query(
            `
            SELECT id
            FROM users
            WHERE id = ?
            LIMIT 1
            `,
            [userId]
        );

        if (!userRows.length) {
            return res.status(401).json({
                success: false,
                message:
                    "User does not exist",
            });
        }

        // PIN MESSAGE
        await db.query(
            `
            INSERT INTO pinned_messages
            (
                message_id,
                pinned_by,
                chat_type,
                group_id
            )
            VALUES (?, ?, ?, ?)

            ON DUPLICATE KEY UPDATE
                created_at =
                    CURRENT_TIMESTAMP
            `,
            [
                messageId,
                userId,
                chatType,
                groupId,
            ]
        );

        console.log(
            "MESSAGE PINNED:",
            {
                messageId,
                pinnedBy: userId,
                chatType,
                groupId,
            }
        );

        return res.status(200).json({
            success: true,
            message:"Message pinned successfully",
        });

    } catch (error) {

        console.error(
            "PIN MESSAGE ERROR:",error
        );

        return res.status(500).json({
            success: false,
            message:"Failed to pin message",
            error:error.message,
        });
    }
};


// UNPIN MESSAGE
export const unpinMessage = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const messageId = Number(req.params.messageId);

        if (!userId || !messageId) {
            return res.status(400).json({
                success: false,
                message: "Message ID is required",
            });
        }

        // Get message
        const [messages] = await db.query(
            `
            SELECT
                id,
                sender_id,
                receiver_id,
                group_id,
                chat_type
            FROM messages
            WHERE id = ?
            LIMIT 1
            `,
            [messageId]
        );

        if (messages.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Message not found",
            });
        }

        const message = messages[0];

        // Check permission
        if (
            message.group_id ||
            message.chat_type === "group"
        ) {
            const [members] = await db.query(
                `
                SELECT id
                FROM group_members
                WHERE group_id = ?
                AND user_id = ?
                LIMIT 1
                `,
                [groupId, senderId]
            );

            if (members.length === 0) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You are not a member of this group",
                });
            }
        } else {
            const isParticipant =
                Number(message.sender_id) === userId ||
                Number(message.receiver_id) === userId;

            if (!isParticipant) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You cannot unpin this message",
                });
            }
        }

        const [result] = await db.query(
            `
            DELETE FROM pinned_messages
            WHERE message_id = ?
            `,
            [messageId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Message is not pinned",
            });
        }

        return res.json({
            success: true,
            message:
                "Message unpinned successfully",
        });

    } catch (error) {
        console.error(
            "UNPIN MESSAGE ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to unpin message",
        });
    }
};


// GET PRIVATE PINNED MESSAGES
export const getPrivatePinnedMessages = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const otherUserId = Number(req.params.userId);

        if (!userId || !otherUserId) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
        }

        const [rows] = await db.query(
            `
            SELECT
                m.*,
                p.id AS pinned_id,
                p.created_at AS pinned_at,
                p.pinned_by

            FROM pinned_messages p

            INNER JOIN messages m
                ON m.id = p.message_id

            WHERE
                p.pinned_by = ?
                AND p.chat_type = 'private'
                AND (
                    (
                        m.sender_id = ?
                        AND
                        m.receiver_id = ?
                    )

                    OR

                    (
                        m.sender_id = ?
                        AND
                        m.receiver_id = ?
                    )
                )

            ORDER BY
                p.created_at DESC
            `,
            [
                userId,
                userId,
                otherUserId,
                otherUserId,
                userId,
            ]
        );

        return res.status(200).json({
            success: true,
            pinnedMessages: rows,
        });

    } catch (error) {

        console.error(
            "GET PRIVATE PINNED MESSAGES ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to get private pinned messages",
            error:
                error.message,
        });
    }
};

// GET GROUP PINNED MESSAGES
export const getGroupPinnedMessages = async (req,res) => {
    try {
        const userId = req.user.id;
        const groupId = Number(req.params.groupId);

        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID",
            });
        }

        // Check if user belongs to group
        const [members] = await db.query(
            `
            SELECT id
            FROM group_members
            WHERE group_id = ?
            AND user_id = ?
            LIMIT 1
            `,
            [groupId, userId]
        );

        if (members.length === 0) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this group",
            });
        }

        // Get pinned group messages
        const [rows] = await db.query(
            `
            SELECT
                pm.id AS pin_id,
                pm.message_id,
                pm.pinned_by,
                pm.created_at AS pinned_at,
                m.*

            FROM pinned_messages pm

            INNER JOIN messages m
                ON m.id = pm.message_id

            WHERE pm.chat_type = 'group'
            AND pm.chat_id = ?

            ORDER BY pm.created_at DESC
            `,
            [groupId]
        );

        return res.status(200).json({
            success: true,
            pinnedMessages: rows,
        });

    } catch (error) {
        console.error(
            "GET GROUP PINNED MESSAGES ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to get group pinned messages",
        });
    }
};
