
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import redisClient from "../config/redis.js";
import { notificationQueue } from "../queue/notificationQueue.js";

const socketHandler = (io) => {

    // =========================================================
    // BROADCAST ALL USERS WITH CURRENT STATUS
    // =========================================================

    const broadcastOnlineUsers = async () => {

        try {

            const [users] = await db.query(
                `
                SELECT
                    id,
                    username,
                    status
                FROM users
                ORDER BY username ASC
                `
            );

            io.emit(
                "onlineUsers",
                users
            );

        } catch (error) {

            console.error(
                "Broadcast Online Users Error:",
                error
            );

        }

    };


    // =========================================================
    // JWT SOCKET AUTHENTICATION
    // =========================================================

    io.use(
        async (
            socket,
            next
        ) => {

            try {

                const token =
                    socket.handshake
                        .auth?.token;

                if (!token) {

                    return next(
                        new Error(
                            "Token Missing"
                        )
                    );

                }

                const decoded =
                    jwt.verify(
                        token,
                        process.env
                            .JWT_ACCESS_SECRET
                    );

                socket.user =
                    decoded;

                console.log(
                    "Socket Authenticated:",
                    decoded
                );

                next();

            } catch (error) {

                console.error(
                    "Socket Authentication Error:",
                    error.message
                );

                next(
                    new Error(
                        "Invalid Token"
                    )
                );

            }

        }
    );


    // =========================================================
    // SOCKET CONNECTION
    // =========================================================

    io.on(
        "connection",
        async (socket) => {

            const userId =
                Number(socket.user?.id);

            if (userId) {

                socket.join(
                    `user_${userId}`
                );

                console.log(
                    `USER ${userId} JOINED PERSONAL ROOM: user_${userId}`
                );

            }

            const username =
                socket.user.username;


            console.log(
                "================================="
            );

            console.log(
                "SOCKET CONNECTED:",
                socket.id
            );

            console.log(
                "USER:",
                username
            );

            console.log(
                "USER ID:",
                userId
            );

            console.log(
                "================================="
            );

            const userRoom = `user_${userId}`; 
            socket.join( userRoom ); 
            console.log( "USER JOINED PERSONAL ROOM:", 
                { 
                    userId, userRoom, socketId: socket.id, 
                } );

            // =====================================================
            // USER ONLINE
            // =====================================================

            try {

                // SAVE SOCKET ID IN REDIS

                await redisClient.set(
                    `user:${userId}`,
                    socket.id
                );


                // UPDATE MYSQL

                await db.query(
                    `
                    UPDATE users
                    SET
                        status = 'online',
                        socket_id = ?
                    WHERE id = ?
                    `,
                    [
                        socket.id,
                        userId
                    ]
                );
                console.log(
                    "USER ONLINE:",
                    userId
                );


                // BROADCAST USERS

                await broadcastOnlineUsers();


                // SOCKET READY

                socket.emit(
                    "socketReady",
                    {
                        userId:
                            userId,

                        socketId:
                            socket.id
                    }
                );


            } catch (error) {

                console.error(
                    "Online User Error:",
                    error
                );

            }


            // =====================================================
            // AUTO JOIN USER GROUPS
            // =====================================================

            try {

                const [groups] =
                    await db.query(
                        `
                        SELECT
                            group_id
                        FROM group_members
                        WHERE user_id = ?
                        `,
                        [
                            userId
                        ]
                    );


                groups.forEach(
                    (
                        group
                    ) => {

                        socket.join(
                            `group_${group.group_id}`
                        );

                        console.log(
                            "Joined Group Room:",
                            group.group_id
                        );

                    }
                );


            } catch (error) {

                console.error(
                    "Auto Join Group Error:",
                    error
                );

            }

// MESSAGE REACTION
socket.on( "messageReaction",
    async (data) => {

        try {
            const userId =
                Number(
                    socket.user?.id
                );

            const messageId =
                Number(
                    data?.messageId
                );

            const reaction =
                String(
                    data?.reaction || ""
                ).trim();


            // VALIDATION
            if (!userId) {

                return socket.emit(
                    "messageError",
                    {
                        message:
                            "Authentication failed"
                    }
                );

            }


            if (!messageId) {
                return socket.emit(
                    "messageError",
                    {
                        message:
                            "Message ID is required"
                    }
                );
            }


            if (!reaction) {
                return socket.emit(
                    "messageError",
                    {
                        message:
                            "Reaction is required"
                    }
                );
            }

            // CHECK MESSAGE
            const [messages]
             = await db.query(
                `
                SELECT
                    id,
                    sender_id,
                    receiver_id
                FROM messages
                WHERE id = ?
                LIMIT 1
                `,
                [messageId]
            );


            if (
                !messages.length
            ) {
                return socket.emit(
                    "messageError",
                    {
                        message:
                            "Message not found"
                    }
                );
            }


            const message =messages[0];

            // CHECK EXISTING REACTION
            const [existing]
             = await db.query(
                `
                SELECT
                    id,
                    reaction
                FROM message_reactions
                WHERE message_id = ?
                AND user_id = ?
                LIMIT 1
                `,
                [messageId,userId]
            );

            // SAME REACTION = REMOVE
            if (
                existing.length &&
                existing[0].reaction ===
                reaction
            ) {
                await db.query(
                    `
                    DELETE FROM
                        message_reactions
                    WHERE
                        message_id = ?
                    AND
                        user_id = ?
                    `,
                    [messageId,userId]
                );

                console.log(
                    "REACTION REMOVED:",
                    {
                        messageId,
                        userId,
                        reaction
                    }
                );
            }

            // DIFFERENT REACTION = UPDATE
            else if (
                existing.length
            ) {
                await db.query(
                    `
                    UPDATE
                        message_reactions
                    SET
                        reaction = ?
                    WHERE
                        message_id = ?
                    AND
                        user_id = ?
                    `,
                    [
                        reaction,
                        messageId,
                        userId
                    ]
                );

                console.log(
                    "REACTION UPDATED:",
                    {
                        messageId,
                        userId,
                        reaction
                    }
                );
            }

            // NEW REACTION
            else {
                await db.query(
                    `
                    INSERT INTO
                        message_reactions
                    (
                        message_id,
                        user_id,
                        reaction
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?
                    )
                    `,
                    [
                        messageId,
                        userId,
                        reaction
                    ]
                );

                console.log(
                    "REACTION ADDED:",
                    {
                        messageId,
                        userId,
                        reaction
                    }
                );
            }

            // GET ALL REACTIONS
            const [
                reactions
            ] = await db.query(
                `
                SELECT
                    user_id,
                    reaction
                FROM message_reactions
                WHERE message_id = ?
                `,
                [
                    messageId
                ]
            );

            // SEND UPDATE
            const reactionData =
                {
                    messageId,
                    reactions
                };

            // SENDER ROOM
            const senderRoom =
                `user_${message.sender_id}`;

            // RECEIVER ROOM
            const receiverRoom =
                `user_${message.receiver_id}`;

            // SEND TO BOTH USERS
            io.to(
                senderRoom
            ).emit(
                "messageReactionUpdated",
                reactionData
            );


            io.to(
                receiverRoom
            ).emit(
                "messageReactionUpdated",
                reactionData
            );


            console.log(
                "REACTION UPDATE SENT:",
                reactionData
            );
        } catch (error) {
            console.error(
                "MESSAGE REACTION ERROR:",
                error
            );

            socket.emit(
                "messageError",
                {
                    message:
                        "Failed to update reaction"
                }
            );
        }
    }
);

// DELETE MESSAGE FOR ME
socket.on("deleteMessageForMe",
    async (data) => {
        try {
            const messageId =Number(data?.messageId);
            const userId =Number(socket.user?.id);
            if (!messageId) {
                return socket.emit(
                    "messageError",
                    {
                        message:"Message ID is required"
                    }
                );
            }

            if (!userId) {
                return socket.emit(
                    "messageError",
                    {
                        message:"Authentication failed"
                    }
                );
            }

            // CHECK MESSAGE EXISTS
            const [rows] =
                await db.query(
                    `
                    SELECT
                        id,
                        sender_id,
                        receiver_id
                    FROM messages
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [messageId]
                );

            if (!rows.length) {
                return socket.emit(
                    "messageError",
                    {
                        message:"Message not found"
                    }
                );
            }

            const message =rows[0];
            // CHECK USER IS PART OF CHAT
            if (
                Number(message.sender_id) !== userId &&
                Number(message.receiver_id) !== userId
            ) {
                return socket.emit(
                    "messageError",
                    {
                        message:"You cannot delete this message"
                    }
                );
            }
            // SAVE DELETE FOR THIS USER ONLY
            await db.query(
                `
                INSERT INTO deleted_messages
                (
                    message_id,
                    user_id
                )
                VALUES
                (
                    ?,
                    ?
                )
                ON DUPLICATE KEY UPDATE
                    deleted_at =
                        CURRENT_TIMESTAMP
                `,
                [
                    messageId,
                    userId
                ]
            );
            console.log(
                "MESSAGE DELETED FOR ME:",
                {
                    messageId,
                    userId
                }
            );

            // SEND ONLY TO CURRENT USER
            socket.emit(
                "messageDeletedForMe",
                {messageId}
            );


        } catch (error) {
            console.error(
                "DELETE MESSAGE FOR ME ERROR:",
                error
            );

            socket.emit(
                "messageError",
                {
                    message:"Failed to delete message for me"
                }
            );
        }
    }
);

// DELETE MESSAGE FOR EVERYONE
socket.on(
    "deleteMessageForEveryone",
    async (data) => {
        try {
            const messageId =
                Number(data?.messageId);
            const currentUserId =
                Number(socket.user?.id);
            if (!messageId) {
                return socket.emit(
                    "messageError",
                    {
                        message:"Message ID is required"
                    }
                );
            }

            if (!currentUserId) {
                return socket.emit(
                    "messageError",
                    {
                        message:"Authentication failed"
                    }
                );
            }

            // GET MESSAGE OWNER + RECEIVER
            const [rows] =
                await db.query(
                    `
                    SELECT
                        id,
                        sender_id,
                        receiver_id
                    FROM messages
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [messageId]
                );

            if (!rows.length) {
                return socket.emit(
                    "messageError",
                    {
                        message:"Message not found"
                    }
                );
            }

            const message =rows[0];
            const senderId =Number(message.sender_id);
            const receiverId =Number(message.receiver_id);

            // ONLY SENDER CAN DELETE FOR EVERYONE
            if (senderId !==currentUserId
            ) {
                return socket.emit(
                    "messageError",
                    {
                        message:"You cannot delete this message for everyone"
                    }
                );
            }

            // MARK MESSAGE AS DELETED
            await db.query(
                `
                UPDATE messages
                SET
                    message = ?,
                    message_type = 'deleted',
                    file_url = NULL,
                    file_name = NULL
                WHERE id = ?
                `,
                [
                    "This message was deleted",
                    messageId
                ]
            );

            console.log(
                "MESSAGE DELETED FOR EVERYONE:",
                {
                    messageId,
                    senderId,
                    receiverId
                }
            );

            // SEND TO SENDER
            io.to(
                `user_${senderId}`
            ).emit(
                "messageDeletedForEveryone",
                {
                    messageId
                }
            );

            // SEND TO RECEIVER
            io.to(
                `user_${receiverId}`
            ).emit(
                "messageDeletedForEveryone",
                {
                    messageId
                }
            );

            console.log(
                "DELETE FOR EVERYONE EVENT SENT:",
                {
                    messageId,
                    senderId,
                    receiverId
                }
            );
        } catch (error) {
            console.error(
                "DELETE FOR EVERYONE ERROR:",
                error
            );
            socket.emit(
                "messageError",
                {
                    message:
                        "Failed to delete message for everyone"
                }
            );
        }
    }
);

// PRIVATE MESSAGE
// WITH REPLY SUPPORT
socket.on("privateMessage",
    async (data) => {

        try {

            // ==================================
            // GET USER IDs
            // ==================================

            const senderId =
                Number(socket.user?.id);

            const receiverId =
                Number(data?.receiverId);

            const text =
                String(
                    data?.message || ""
                ).trim();

            // Message ID of the message
            // that user is replying to
            const replyToMessageId =
                data?.replyToMessageId
                    ? Number(data.replyToMessageId)
                    : null;


            // ==================================
            // VALIDATION
            // ==================================

            if (!senderId) {
                return socket.emit(
                    "messageError",
                    {
                        message:
                            "Sender authentication failed"
                    }
                );
            }

            if (!receiverId) {
                return socket.emit(
                    "messageError",
                    {
                        message:
                            "Receiver ID is required"
                    }
                );
            }

            if (!text) {
                return socket.emit(
                    "messageError",
                    {
                        message:
                            "Message cannot be empty"
                    }
                );
            }


            // ==================================
            // VALIDATE REPLY MESSAGE
            // ==================================

            let replyToMessage = null;

            if (replyToMessageId) {

                const [
                    replyRows
                ] = await db.query(
                    `
                    SELECT
                        m.id,
                        m.sender_id,
                        m.receiver_id,
                        m.message,
                        m.message_type,
                        m.file_url,
                        m.created_at,

                        u.username
                            AS sender_username

                    FROM messages m

                    LEFT JOIN users u
                        ON u.id =
                           m.sender_id

                    WHERE
                        m.id = ?

                    AND
                    m.chat_type = 'private'

                    LIMIT 1
                    `,
                    [
                        replyToMessageId
                    ]
                );


                // Check original message
                if (replyRows.length > 0) {

                    replyToMessage =
                        replyRows[0];

                } else {

                    // If replied message
                    // does not exist
                    replyToMessageId =
                        null;
                }
            }


            // ==================================
            // SAVE MESSAGE
            // ==================================

            const [
                result
            ] = await db.query(
                `
                INSERT INTO messages
                (
                    sender_id,
                    receiver_id,
                    chat_type,
                    message,
                    message_type,
                    file_url,
                    reply_to_message_id
                )
                VALUES
                (
                    ?,
                    ?,
                    'private',
                    ?,
                    'text',
                    NULL,
                    ?
                )
                `,
                [
                    senderId,
                    receiverId,
                    text,
                    replyToMessageId
                ]
            );


            // New message ID
            const messageId =
                result.insertId;


            // ==================================
            // GET SAVED MESSAGE
            // ==================================

            const [
                rows
            ] = await db.query(
                `
                SELECT
                    m.id,
                    m.sender_id,
                    m.receiver_id,

                    sender.username
                        AS sender_username,

                    receiver.username
                        AS receiver_username,

                    m.chat_type,
                    m.message,
                    m.message_type,
                    m.file_url,

                    m.reply_to_message_id,

                    m.created_at

                FROM messages m

                LEFT JOIN users sender
                    ON sender.id =
                       m.sender_id

                LEFT JOIN users receiver
                    ON receiver.id =
                       m.receiver_id

                WHERE
                    m.id = ?

                LIMIT 1
                `,
                [
                    messageId
                ]
            );


            const savedMessage =
                rows[0];


            // ==================================
            // FINAL MESSAGE
            // ==================================

            const finalMessage = {

                ...savedMessage,

                status:
                    "sent",

                // Original replied message
                reply_to_message:
                    replyToMessage

            };


            // ==================================
            // DEBUG
            // ==================================

            console.log(
                "PRIVATE MESSAGE COMPLETE:",
                {
                    messageId,
                    senderId,
                    receiverId,
                    text,
                    replyToMessageId,
                    replyToMessage
                }
            );


            // ==================================
            // SEND TO SENDER
            // ==================================

            socket.emit(
                "privateMessage",
                finalMessage
            );


            // ==================================
            // SEND TO RECEIVER
            // ==================================

            io.to(
                `user_${receiverId}`
            ).emit(
                "privateMessage",
                {
                    ...finalMessage,

                    status:
                        "delivered"
                }
            );


        } catch (error) {

            console.error(
                "PRIVATE MESSAGE ERROR:",
                error
            );

            socket.emit(
                "messageError",
                {
                    message:
                        "Failed to send message"
                }
            );

        }

    }
);


// ==========================================
// FORWARD PRIVATE MESSAGE
// ==========================================
socket.on(
    "forwardMessage",
    async (data) => {

        try {
            // 1. GET SENDER / RECEIVER / MESSAGE ID
            const senderId =
                Number(
                    socket.user?.id
                );

            const receiverId =
                Number(
                    data?.receiverId
                );

            const messageId =
                Number(
                    data?.messageId
                );


            // 2. VALIDATION
            if (!senderId) {

                return socket.emit(
                    "messageError",
                    {
                        message:
                            "Sender authentication failed"
                    }
                );

            }

            if (!receiverId) {

                return socket.emit(
                    "messageError",
                    {
                        message:
                            "Receiver ID is required"
                    }
                );

            }

            if (!messageId) {

                return socket.emit(
                    "messageError",
                    {
                        message:
                            "Message ID is required"
                    }
                );

            }

            if (
                senderId ===
                receiverId
            ) {

                return socket.emit(
                    "messageError",
                    {
                        message:
                            "Cannot forward message to yourself"
                    }
                );

            }


            console.log(
                "FORWARD MESSAGE REQUEST:",
                {
                    senderId,
                    receiverId,
                    messageId
                }
            );

            // 3. GET ORIGINAL MESSAGE
            const [
                rows
            ] = await db.query(
                `
                SELECT
                    id,
                    message,
                    message_type,
                    file_url,
                    file_name
                FROM messages
                WHERE id = ?
                LIMIT 1
                `,
                [
                    messageId
                ]
            );


            if (
                !rows.length
            ) {

                return socket.emit(
                    "messageError",
                    {
                        message:
                            "Original message not found"
                    }
                );

            }


            const originalMessage =
                rows[0];

            // 4. INSERT FORWARDED MESSAGE
            const [
                result
            ] = await db.query(
                `
                INSERT INTO messages
                (
                    sender_id,
                    receiver_id,
                    chat_type,
                    message,
                    message_type,
                    file_url,
                    file_name
                )
                VALUES
                (
                    ?,
                    ?,
                    'private',
                    ?,
                    ?,
                    ?,
                    ?
                )
                `,
                [
                    senderId,
                    receiverId,
                    originalMessage.message,
                    originalMessage.message_type,
                    originalMessage.file_url,
                    originalMessage.file_name
                ]
            );


            // IMPORTANT
            // THIS FIXES:
            // newMessageId is not defined
            const newMessageId =
                result.insertId;

            // 5. CREATE FORWARDED MESSAGE OBJECT
            const forwardedMessage =
                {
                    id:
                        newMessageId,

                    sender_id:
                        senderId,

                    receiver_id:
                        receiverId,

                    chat_type:
                        "private",

                    message:
                        originalMessage.message,

                    message_type:
                        originalMessage.message_type,

                    file_url:
                        originalMessage.file_url,

                    file_name:
                        originalMessage.file_name,

                    is_forwarded:
                        true,

                    status:
                        "sent",

                    created_at:
                        new Date()
                };


            console.log(
                "FORWARDED MESSAGE CREATED:",
                forwardedMessage
            );


            // 6. SAVE MESSAGE STATUS
            const receiverRoom =
                `user_${receiverId}`;


            const receiverSockets =
                io.sockets.adapter.rooms.get(
                    receiverRoom
                );


            const receiverOnline =
                Boolean(
                    receiverSockets &&
                    receiverSockets.size > 0
                );


            await db.query(
                `
                INSERT INTO message_status
                (
                    message_id,
                    user_id,
                    status
                )
                VALUES
                (
                    ?,
                    ?,
                    ?
                )
                ON DUPLICATE KEY UPDATE
                    status = VALUES(status)
                `,
                [
                    newMessageId,
                    receiverId,
                    receiverOnline
                        ? "delivered"
                        : "sent"
                ]
            );

            // 7. SEND TO SENDER
            socket.emit(
                "privateMessage",
                {
                    ...forwardedMessage,
                    status:
                        "sent"
                }
            );

            // 8. SEND TO RECEIVER
            io.to(
                receiverRoom
            ).emit(
                "privateMessage",
                {
                    ...forwardedMessage,
                    status:
                        receiverOnline
                            ? "delivered"
                            : "sent"
                }
            );

            // 9. CREATE FORWARD NOTIFICATION
            const forwardNotification =
                {
                    type:
                        "forwarded_message",

                    messageId:
                        newMessageId,

                    senderId:
                        senderId,

                    receiverId:
                        receiverId,

                    message:
                        originalMessage.message,

                    messageType:
                        originalMessage.message_type,

                    isForwarded:
                        true,

                    createdAt:
                        forwardedMessage.created_at
                };


            // 10. SAVE NOTIFICATION TO MYSQL
            try {

                await db.query(
                    `
                    INSERT INTO notifications
                    (
                        sender_id,
                        user_id,
                        type,
                        message,
                        is_read,
                        created_at
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        0,
                        ?
                    )
                    `,
                    [
                        senderId,
                        receiverId,
                        "forwarded_message",
                        originalMessage.message,
                        forwardedMessage.created_at
                    ]
                );


                console.log(
                    "FORWARD NOTIFICATION SAVED:",
                    {
                        senderId,
                        receiverId,
                        messageId:
                            newMessageId
                    }
                );

            } catch (
                notificationError
            ) {

                console.error(
                    "FORWARD NOTIFICATION DB ERROR:",
                    notificationError
                );

            }

            // 11. SEND REAL-TIME NOTIFICATION
            io.to(
                receiverRoom
            ).emit(
                "newNotification",
                forwardNotification
            );


            console.log(
                "🔔 FORWARDED MESSAGE NOTIFICATION SENT:",
                forwardNotification
            );

            // 12. DELIVERED EVENT
            if (
                receiverOnline
            ) {

                socket.emit(
                    "messageDelivered",
                    {
                        messageId:
                            newMessageId,

                        status:
                            "delivered"
                    }
                );

            }

            // 13. SUCCESS LOG
            console.log(
                "✅ MESSAGE FORWARDED SUCCESSFULLY:",
                {
                    messageId:
                        newMessageId,

                    senderId,

                    receiverId,

                    receiverOnline
                }
            );


        } catch (
            error
        ) {

            console.error(
                "FORWARD MESSAGE ERROR:",
                error
            );


            socket.emit(
                "messageError",
                {
                    message:
                        "Failed to forward message"
                }
            );

        }

    }
);


// ==========================================
// GET REPLY MESSAGE DETAILS
// ==========================================
const getReplyMessage = async (replyToMessageId) => {

    if (!replyToMessageId) {
        return null;
    }

    const [rows] = await db.query(
        `
        SELECT
            m.id,
            m.sender_id,
            m.receiver_id,
            m.group_id,
            m.message,
            m.message_type,
            m.file_url,
            m.file_name,
            m.chat_type,
            m.created_at,
            u.username AS sender_username
        FROM messages m
        LEFT JOIN users u
            ON u.id = m.sender_id
        WHERE m.id = ?
        LIMIT 1
        `,
        [replyToMessageId]
    );

    return rows.length
        ? rows[0]
        : null;
};


            // GET PRIVATE MESSAGE HISTORY WITH PAGINATION
            socket.on(
                "getPrivateHistory",
                async (data) => {

                    try {

                        const senderId =
                            Number(
                                socket.user?.id
                            );


                        const receiverId =
                            Number(
                                data?.receiverId ??
                                data?.receiver_id
                            );


                        const page =
                            Math.max(
                                Number(
                                    data?.page
                                ) || 1,
                                1
                            );


                        const limit =
                            Math.min(
                                Math.max(
                                    Number(
                                        data?.limit
                                    ) || 20,
                                    1
                                ),
                                100
                            );


                        const offset =
                            (page - 1) *
                            limit;


                        if (
                            !senderId
                        ) {

                            return socket.emit(
                                "privateHistory",
                                {
                                    receiverId:receiverId,
                                    messages:[],
                                    page:page,
                                    limit:limit,
                                    total:0,
                                    hasMore:false
                                }
                            );
                        }


                        if (
                            !receiverId
                        ) {
                            return socket.emit(
                                "privateHistory",
                                {
                                    receiverId:receiverId,
                                    messages:[],
                                    page:page,
                                    limit:limit,
                                    total:0,
                                    hasMore:false
                                }
                            );
                        }

                        if (
                            senderId ===
                            receiverId
                        ) {
                            return socket.emit(
                                "privateHistory",
                                {
                                    receiverId:receiverId,
                                    messages:[],
                                    page:page,
                                    limit:limit,
                                    total:0,
                                    hasMore:false
                                }
                            );
                        }


                        console.log(
                            "GET PRIVATE HISTORY:",
                            {
                                senderId,
                                receiverId,
                                page,
                                limit,
                                offset
                            }
                        );


                        // GET TOTAL COUNT

                        const [
                            countRows
                        ] = await db.query(
                            `
                            SELECT
                                COUNT(*) AS total

                            FROM messages

                            WHERE
                                chat_type = 'private'
                                AND
                                (
                                    (
                                        sender_id = ?
                                        AND
                                        receiver_id = ?
                                    )

                                    OR

                                    (
                                        sender_id = ?
                                        AND
                                        receiver_id = ?
                                    )
                                )
                            `,
                            [
                                senderId,
                                receiverId,
                                receiverId,
                                senderId
                            ]
                        );


                        const total =
                            Number(
                                countRows[0]?.total ||
                                0
                            );


                        // GET PRIVATE MESSAGES

                        const [
                            messages
                        ] = await db.query(
                            `
                            SELECT
                                m.id,
                                m.sender_id,
                                m.receiver_id,
                                m.chat_type,
                                m.message,
                                m.message_type,
                                m.file_url,
                                m.created_at,
                                COALESCE(
                                    ms.status,
                                    'sent'
                                ) AS status
                            FROM messages m
                            LEFT JOIN message_status ms
                                ON
                                    ms.message_id =
                                    m.id
                                AND
                                    ms.user_id =
                                    ?
                            WHERE
                                m.chat_type =
                                'private'
                                AND
                                (
                                    (
                                        m.sender_id =
                                        ?
                                        AND
                                        m.receiver_id =
                                        ?
                                    )
                                    OR
                                    (
                                        m.sender_id =
                                        ?
                                       AND
                                        m.receiver_id =
                                        ?
                                    )
                                )
                            ORDER BY
                                m.created_at DESC,
                                m.id DESC
                            LIMIT ?
                            OFFSET ?
                            `,
                            [
                                senderId,

                                senderId,
                                receiverId,

                                receiverId,
                                senderId,

                                limit,
                                offset
                            ]
                        );


                        // DATABASE NEWEST FIRST
                        // CHAT UI OLDEST FIRST
                        messages.reverse();
                        const hasMore =
                            (
                                offset +
                                messages.length
                            ) <
                            total;

                        socket.emit(
                            "privateHistory",
                            {
                                receiverId:receiverId,
                                messages:messages,
                                page:page,
                                limit:limit,
                                total:total,
                                hasMore:hasMore
                            }
                        );

                    } catch (error) {
                        console.error(
                            "PRIVATE HISTORY ERROR:",
                            error
                        );

                        socket.emit(
                            "privateHistory",
                            {
                                receiverId:
                                    Number(
                                        data?.receiverId ||
                                        data?.receiver_id ||
                                        0
                                    ),
                                messages:[],
                                page:1,
                                limit:20,
                                total:0,
                                hasMore:false
                            }
                        );
                    }
                }
            );

         
// MESSAGE SEEN
socket.on("messageSeen", async (data) => {
    try {
        const userId = Number(socket.user?.id);
        const messageId = Number(data?.messageId);

        if (!userId || !messageId) {
            console.log("Invalid messageSeen data:", data);
            return;
        }

        // Find message
        const [messageRows] = await db.query(
            `
            SELECT
                id,
                sender_id,
                receiver_id
            FROM messages
            WHERE id = ?
            LIMIT 1
            `,
            [messageId]
        );

        if (!messageRows.length) {
            console.log(
                "Message not found:",
                messageId
            );
            return;
        }

        const message = messageRows[0];

        // Only receiver can mark message as seen
        if (
            Number(message.receiver_id) !==
            userId
        ) {
            console.log(
                "Unauthorized messageSeen attempt:",
                {
                    userId,
                    messageId,
                    receiverId:message.receiver_id,
                }
            );
            return;
        }

        // Update message status
        await db.query(
            `
            INSERT INTO message_status
            (
                message_id,
                user_id,
                status
            )
            VALUES
            (
                ?,
                ?,
                'seen'
            )
            ON DUPLICATE KEY UPDATE
                status = 'seen'
            `,
            [
                messageId,
                userId,
            ]
        );

        console.log(
            "MESSAGE MARKED AS SEEN:",
            {
                messageId,
                senderId:message.sender_id,
                receiverId:userId,
            }
        );

        // Notify original sender
        io.to(
            `user_${message.sender_id}`
        ).emit(
            "messageSeen",
            {
                messageId:messageId,
                senderId:userId,
                receiverId:message.receiver_id,
                status:"seen",
            }
        );

    } catch (error) {
        console.error(
            "MESSAGE SEEN ERROR:",
            error
        );
    }
});

// MESSAGE DELIVERED
socket.on("messageDelivered", async (data) => {
    try {
        const userId = Number(socket.user?.id);
        const messageId = Number(data?.messageId);

        if (!userId || !messageId) {
            console.log("Invalid messageDelivered data:", data);
            return;
        }

        // Find message
        const [messageRows] = await db.query(
            `
            SELECT
                id,
                sender_id,
                receiver_id
            FROM messages
            WHERE id = ?
            LIMIT 1
            `,
            [messageId]
        );

        if (!messageRows.length) {
            console.log(
                "Message not found:",
                messageId
            );
            return;
        }

        const message = messageRows[0];

        // Only receiver can mark message as delivered
        if (
            Number(message.receiver_id) !==
            userId
        ) {
            console.log(
                "Unauthorized delivered attempt:",
                {
                    userId,
                    messageId,
                }
            );

            return;
        }

        // Save delivered status
        await db.query(
            `
            INSERT INTO message_status
            (
                message_id,
                user_id,
                status
            )
            VALUES
            (
                ?,
                ?,
                'delivered'
            )
            ON DUPLICATE KEY UPDATE
                status =
                    CASE
                        WHEN status = 'seen'
                        THEN 'seen'
                        ELSE 'delivered'
                    END
            `,
            [
                messageId,
                userId,
            ]
        );

        console.log(
            "MESSAGE MARKED DELIVERED:",
            {
                messageId,
                senderId:message.sender_id,
                receiverId:userId,
            }
        );

        // Notify sender
        io.to(
            `user_${message.sender_id}`
        ).emit(
            "messageDelivered",
            {
                messageId:messageId,
                senderId:message.sender_id,
                receiverId:userId,
                status:"delivered",
            }
        );

    } catch (error) {
        console.error(
            "MESSAGE DELIVERED ERROR:",
            error
        );
    }
});

            // =====================================================
            // JOIN GROUP ROOM
            // =====================================================

            socket.on(
                "joinGroupRoom",
                async (data) => {

                    try {

                        const groupId =
                            Number(
                                data?.group_id ||
                                data?.groupId
                            );


                        if (
                            !groupId
                        ) {

                            return socket.emit(
                                "messageError",
                                {
                                    message:
                                        "Group ID is required"
                                }
                            );

                        }


                        const room =
                            `group_${groupId}`;


                        socket.join(
                            room
                        );


                        console.log(
                            `USER ${socket.user.id} JOINED GROUP ROOM:`,
                            room
                        );


                    } catch (error) {

                        console.error(
                            "JOIN GROUP ERROR:",
                            error
                        );

                    }

                }
            );


            // =====================================================
            // GROUP MESSAGE
            // =====================================================

            socket.on(
                "groupMessage",
                async (data) => {

                    try {

                        const senderId =
                            Number(
                                socket.user?.id
                            );

                        const groupId =
                            Number(
                                data?.group_id ||
                                data?.groupId
                            );

                        const message =
                            String(
                                data?.message ||
                                ""
                            ).trim();


                        if (
                            !senderId
                        ) {

                            return socket.emit(
                                "messageError",
                                {
                                    message:
                                        "Authentication failed"
                                }
                            );

                        }


                        if (
                            !groupId
                        ) {

                            return socket.emit(
                                "messageError",
                                {
                                    message:
                                        "Group ID is required"
                                }
                            );

                        }


                        if (
                            !message
                        ) {

                            return socket.emit(
                                "messageError",
                                {
                                    message:
                                        "Message is required"
                                }
                            );

                        }


                        // SAVE GROUP MESSAGE

                        const [
                            result
                        ] = await db.query(
                            `
                            INSERT INTO messages
                                        (
                                            sender_id,
                                            group_id,
                                            chat_type,
                                            message,
                                            message_type,
                                            file_url,
                                            reply_to_message_id
                                        )
                                        VALUES
                                        (
                                            ?,
                                            ?,
                                            'group',
                                            ?,
                                            'text',
                                            NULL,
                                            ?
                                        )
                            `,
                            [
                                senderId,
                                groupId,
                                text,
                                replyToMessageId
                            ]
                        );


                        const messageId =
                            result.insertId;


                        // GET SAVED MESSAGE

                        const [
                            rows
                        ] = await db.query(
                            `
                            SELECT
                                m.id,
                                m.sender_id,
                                m.receiver_id,
                                m.room_id,
                                m.chat_type,
                                m.message,
                                m.message_type,
                                m.created_at,

                                u.username AS sender_username

                            FROM messages m

                            LEFT JOIN users u
                                ON u.id =
                                m.sender_id

                            WHERE m.id = ?

                            LIMIT 1
                            `,
                            [
                                messageId
                            ]
                        );


                        const savedMessage =
                            {
                                ...rows[0],

                                group_id:
                                    groupId
                            };


                        io.to(
                            `group_${groupId}`
                        ).emit(
                            "groupMessage",
                            savedMessage
                        );


                    } catch (error) {

                        console.error(
                            "GROUP MESSAGE ERROR:",
                            error
                        );


                        socket.emit(
                            "messageError",
                            {
                                message:
                                    "Failed to send group message"
                            }
                        );

                    }

                }
            );


            // =====================================================
            // GROUP HISTORY
            // =====================================================

            socket.on(
                "getGroupHistory",
                async (data) => {

                    try {

                        const groupId =
                            Number(
                                data?.groupId ??
                                data?.group_id
                            );


                        if (
                            !groupId
                        ) {

                            return;

                        }


                        const [
                            messages
                        ] = await db.query(
                            `
                            SELECT
                                m.id,
                                m.sender_id,
                                m.room_id AS group_id,
                                m.message,
                                m.message_type,
                                m.created_at,

                                u.username

                            FROM messages m

                            JOIN users u
                                ON u.id =
                                m.sender_id

                            WHERE
                                m.room_id =
                                ?

                                AND

                                m.chat_type =
                                'group'

                            ORDER BY
                                m.created_at ASC
                            `,
                            [
                                groupId
                            ]
                        );


                        socket.emit(
                            "groupHistory",
                            messages
                        );


                    } catch (error) {

                        console.error(
                            "Group History Error:",
                            error
                        );

                    }

                }
            );


            // =====================================================
            // TYPING
            // =====================================================

            socket.on(
                "typing",
                async (data) => {

                    try {

                        const receiverId =
                            Number(
                                data?.receiverId
                            );


                        if (
                            !receiverId
                        ) {

                            return;

                        }


                        const receiverSocketId =
                            await redisClient.get(
                                `user:${receiverId}`
                            );


                        if (
                            receiverSocketId
                        ) {

                            io.to(
                                receiverSocketId
                            ).emit(
                                "typing",
                                {
                                    senderId:
                                        userId,

                                    username:
                                        username
                                }
                            );

                        }


                    } catch (error) {

                        console.error(
                            "Typing Error:",
                            error
                        );

                    }

                }
            );


            // =====================================================
            // STOP TYPING
            // =====================================================

            socket.on(
                "stopTyping",
                async (data) => {

                    try {

                        const receiverId =
                            Number(
                                data?.receiverId
                            );


                        if (
                            !receiverId
                        ) {

                            return;

                        }


                        const receiverSocketId =
                            await redisClient.get(
                                `user:${receiverId}`
                            );


                        if (
                            receiverSocketId
                        ) {

                            io.to(
                                receiverSocketId
                            ).emit(
                                "stopTyping",
                                {
                                    senderId:
                                        userId
                                }
                            );

                        }


                    } catch (error) {

                        console.error(
                            "Stop Typing Error:",
                            error
                        );

                    }

                }
            );


            // =====================================================
            // PRIVATE MEDIA
            // IMAGE / VIDEO / TXT / PDF / DOC / DOCX / FILE
            // =====================================================

            socket.on(
                "privateMedia",
                async (data) => {

                    try {

                        const senderId =
                            Number(
                                socket.user?.id
                            );

                        const receiverId =
                            Number(
                                data?.receiverId ??
                                data?.receiver
                            );

                        const fileName =
                            data?.file_name ||
                            data?.fileName ||
                            "";

                        const fileUrl =
                            data?.file_url ||
                            data?.fileUrl ||
                            "";

                        const fileType =
                            data?.file_type ||
                            data?.fileType ||
                            "";


                        // VALIDATION

                        if (
                            !senderId
                        ) {

                            return socket.emit(
                                "messageError",
                                {
                                    message:
                                        "Sender authentication failed"
                                }
                            );

                        }


                        if (
                            !receiverId
                        ) {

                            return socket.emit(
                                "messageError",
                                {
                                    message:
                                        "Receiver ID is required"
                                }
                            );

                        }


                        if (
                            !fileName ||
                            !fileUrl ||
                            !fileType
                        ) {

                            return socket.emit(
                                "messageError",
                                {
                                    message:
                                        "File information is required"
                                }
                            );

                        }


                        // DETERMINE MESSAGE TYPE

                        let messageType =
                            "document";


                        if (
                            fileType.startsWith(
                                "image/"
                            )
                        ) {

                            messageType =
                                "image";

                        } else if (
                            fileType.startsWith(
                                "video/"
                            )
                        ) {

                            messageType =
                                "video";

                        }


                        // SAVE FILE MESSAGE

                        const [
                            result
                        ] = await db.query(
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
                                ?,
                                ?,
                                'private',
                                ?,
                                ?,
                                ?,
                                NOW()
                            )
                            `,
                            [
                                senderId,
                                receiverId,
                                fileName,
                                messageType,
                                fileUrl
                            ]
                        );


                        const messageId =
                            result.insertId;


                        // CHECK RECEIVER ONLINE

                        const receiverRoom =
                            `user_${receiverId}`;


                        const receiverSockets =
                            io.sockets.adapter.rooms.get(
                                receiverRoom
                            );


                        const receiverOnline =
                            Boolean(
                                receiverSockets &&
                                receiverSockets.size > 0
                            );


                        // SAVE MESSAGE STATUS

                        await db.query(
                            `
                            INSERT INTO message_status
                            (
                                message_id,
                                user_id,
                                status
                            )
                            VALUES
                            (
                                ?,
                                ?,
                                ?
                            )
                            ON DUPLICATE KEY UPDATE
                                status = VALUES(status)
                            `,
                            [
                                messageId,
                                receiverId,

                                receiverOnline
                                    ? "delivered"
                                    : "sent"
                            ]
                        );


                        // GET SAVED MESSAGE

                        const [
                            rows
                        ] = await db.query(
                            `
                            SELECT
                                m.id,
                                m.sender_id,
                                m.receiver_id,
                                m.chat_type,
                                m.message,
                                m.message_type,
                                m.file_url,
                                m.created_at,

                                COALESCE(
                                    ms.status,
                                    'sent'
                                ) AS status

                            FROM messages m

                            LEFT JOIN message_status ms
                                ON ms.message_id =
                                m.id

                                AND

                                ms.user_id =
                                ?

                            WHERE m.id = ?

                            LIMIT 1
                            `,
                            [
                                receiverId,
                                messageId
                            ]
                        );


                        if (
                            !rows.length
                        ) {

                            throw new Error(
                                "File message saved but could not be retrieved"
                            );

                        }


                        const savedMessage =
                            {
                                ...rows[0],

                                file_name:
                                    fileName,

                                file_type:
                                    fileType,

                                status:
                                    receiverOnline
                                        ? "delivered"
                                        : "sent"
                            };


                        // SEND TO SENDER

                        socket.emit(
                            "privateMedia",
                            savedMessage
                        );


                        // SEND TO RECEIVER

                        if (
                            receiverOnline
                        ) {

                            io.to(
                                receiverRoom
                            ).emit(
                                "privateMedia",
                                savedMessage
                            );


                            // ==========================================
                            // WHATSAPP-STYLE MEDIA NOTIFICATION
                            // ==========================================

                            const notification =
                                {
                                    type:
                                        "private_media",

                                    messageId:
                                        messageId,

                                    senderId:
                                        senderId,

                                    receiverId:
                                        receiverId,

                                    message:
                                        fileName,

                                    messageType:
                                        messageType,

                                    createdAt:
                                        savedMessage.created_at
                                };


                            io.to(
                                receiverRoom
                            ).emit(
                                "newNotification",
                                notification
                            );


                            console.log(
                                "🔔 PRIVATE MEDIA NOTIFICATION SENT:",
                                notification
                            );


                            socket.emit(
                                "messageDelivered",
                                {
                                    messageId,

                                    status:
                                        "delivered"
                                }
                            );

                        } else {

                            // ==========================================
                            // OFFLINE NOTIFICATION QUEUE
                            // ==========================================

                            try {

                                await notificationQueue.add(
                                    "offline-message",
                                    {
                                        senderId,

                                        receiverId,

                                        messageId,

                                        message:
                                            fileName
                                    }
                                );


                            } catch (error) {

                                console.error(
                                    "Notification Queue Error:",
                                    error
                                );

                            }

                        }


                    } catch (error) {

                        console.error(
                            "PRIVATE MEDIA ERROR:",
                            error
                        );


                        socket.emit(
                            "messageError",
                            {
                                message:
                                    "Failed to send private media"
                            }
                        );

                    }

                }
            );


            // =====================================================
            // GROUP MEDIA
            // =====================================================

            socket.on(
                "groupMedia",
                async (data) => {

                    try {

                        const senderId =
                            Number(
                                socket.user?.id
                            );

                        const groupId =
                            Number(
                                data?.groupId ??
                                data?.group_id
                            );

                        const fileName =
                            data?.file_name ||
                            data?.fileName ||
                            "";

                        const fileUrl =
                            data?.file_url ||
                            data?.fileUrl ||
                            "";

                        const fileType =
                            data?.file_type ||
                            data?.fileType ||
                            "";


                        if (
                            !senderId
                        ) {

                            return socket.emit(
                                "messageError",
                                {
                                    message:
                                        "Sender authentication failed"
                                }
                            );

                        }


                        if (
                            !groupId
                        ) {

                            return socket.emit(
                                "messageError",
                                {
                                    message:
                                        "Group ID is required"
                                }
                            );

                        }


                        if (
                            !fileName ||
                            !fileUrl ||
                            !fileType
                        ) {

                            return socket.emit(
                                "messageError",
                                {
                                    message:
                                        "File information is required"
                                }
                            );

                        }


                        let messageType =
                            "document";


                        if (
                            fileType.startsWith(
                                "image/"
                            )
                        ) {

                            messageType =
                                "image";

                        } else if (
                            fileType.startsWith(
                                "video/"
                            )
                        ) {

                            messageType =
                                "video";

                        }


                        // SAVE TO MYSQL

                        const [
                            result
                        ] = await db.query(
                            `
                            INSERT INTO messages
                            (
                                sender_id,
                                receiver_id,
                                room_id,
                                chat_type,
                                message,
                                message_type,
                                file_url,
                                created_at
                            )
                            VALUES
                            (
                                ?,
                                NULL,
                                ?,
                                'group',
                                ?,
                                ?,
                                ?,
                                NOW()
                            )
                            `,
                            [
                                senderId,
                                groupId,
                                fileName,
                                messageType,
                                fileUrl
                            ]
                        );


                        const messageId =
                            result.insertId;


                        // GET SAVED MESSAGE

                        const [
                            rows
                        ] = await db.query(
                            `
                            SELECT
                                m.id,
                                m.sender_id,
                                m.receiver_id,
                                m.room_id,
                                m.chat_type,
                                m.message,
                                m.message_type,
                                m.file_url,
                                m.created_at,

                                u.username AS sender_username

                            FROM messages m

                            LEFT JOIN users u
                                ON u.id =
                                m.sender_id

                            WHERE m.id = ?

                            LIMIT 1
                            `,
                            [
                                messageId
                            ]
                        );


                        if (
                            !rows.length
                        ) {

                            throw new Error(
                                "Group media saved but not found"
                            );

                        }


                        const savedMessage =
                            {
                                ...rows[0],

                                group_id:
                                    groupId,

                                file_name:
                                    fileName,

                                file_type:
                                    fileType
                            };


                        // SEND TO GROUP ROOM

                        io.to(
                            `group_${groupId}`
                        ).emit(
                            "groupMedia",
                            savedMessage
                        );


                    } catch (error) {

                        console.error(
                            "GROUP MEDIA ERROR:",
                            error
                        );


                        socket.emit(
                            "messageError",
                            {
                                message:
                                    "Failed to send group media"
                            }
                        );

                    }

                }
            );


            // DISCONNECT
    socket.on( "disconnect",async () => {
            try {
                const userId =
                    socket.user?.id;

                if (!userId) {
                    return;
                }

                await db.query(
                    `
                    UPDATE users
                    SET
                        status = 'offline',
                        socket_id = NULL
                    WHERE id = ?
                    `,
                    [userId]
                );

                console.log(
                    "USER OFFLINE:",
                    userId
                );

                await broadcastOnlineUsers();

            } catch (error) {
                console.error(
                    "DISCONNECT STATUS ERROR:",
                    error
                );
            }
        }
    );

        }
    );

};

export default socketHandler;

