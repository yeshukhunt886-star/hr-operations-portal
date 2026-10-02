import db from "../../config/db.js";

export default function privateChat(io, socket) {

    console.log(`Private chat socket connected: ${socket.id}`);

    socket.on("privateMessage", async (data) => {

        try {

            const senderId = socket.user.id;

            const {
                receiverId,
                message
            } = data;

            // Validate data
            if (!receiverId || !message || message.trim() === "") {
                socket.emit("privateMessageError", {
                    message: "Receiver and message are required"
                });
                return;
            }

            // Check receiver exists
            const [users] = await db.query(
                `SELECT id, username, socket_id, status
                 FROM users
                 WHERE id = ?`,
                [receiverId]
            );

            if (users.length === 0) {

                socket.emit("privateMessageError", {
                    message: "Receiver not found"
                });

                return;
            }

            const receiver = users[0];

            // Save message in MySQL
            const [result] = await db.query(
                `INSERT INTO messages
                (sender_id, receiver_id, message, created_at)
                VALUES (?, ?, ?, NOW())`,
                [
                    senderId,
                    receiverId,
                    message.trim()
                ]
            );

            // Get inserted message
            const [savedMessages] = await db.query(
                `SELECT
                    m.id,
                    m.sender_id,
                    m.receiver_id,
                    m.message,
                    m.created_at,
                    u.username AS sender_username
                 FROM messages m
                 JOIN users u
                    ON m.sender_id = u.id
                 WHERE m.id = ?`,
                [result.insertId]
            );

            const savedMessage = savedMessages[0];

            // Send message to sender
            socket.emit("privateMessageSent", savedMessage);

            // If receiver is online
            if (
                receiver.status === "online" &&
                receiver.socket_id
            ) {

                io.to(receiver.socket_id).emit(
                    "receivePrivateMessage",
                    savedMessage
                );

                console.log(
                    `Message sent to online user: ${receiver.username}`
                );

            } else {

                console.log(
                    `User ${receiver.username} is offline. Message saved in database.`
                );

            }

        } catch (error) {

            console.error(
                "Private Message Error:",
                error
            );

            socket.emit(
                "privateMessageError",
                {
                    message: "Failed to send private message"
                }
            );

        }

    });

}