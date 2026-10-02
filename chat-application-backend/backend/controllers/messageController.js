import pool from "../../config/db.js";


// =================================
// SEND PRIVATE MESSAGE - REST API
// =================================

export const sendPrivateMessage = async (req, res) => {

    try {

        const senderId = req.user.id;

        const {
            receiverId,
            message
        } = req.body;


        if (!receiverId || !message) {

            return res.status(400).json({
                message: "Receiver and message are required"
            });

        }


        // Check receiver exists
        const [users] = await pool.query(
            "SELECT id FROM users WHERE id = ?",
            [receiverId]
        );


        if (users.length === 0) {

            return res.status(404).json({
                message: "Receiver not found"
            });

        }


        // Save message
        const [result] = await pool.query(

            `INSERT INTO messages
            (sender_id, receiver_id, message)
            VALUES (?, ?, ?)`,
            
            [
                senderId,
                receiverId,
                message
            ]

        );


        res.status(201).json({

            message: "Message sent successfully",

            data: {

                id: result.insertId,

                sender_id: senderId,

                receiver_id: receiverId,

                message

            }

        });


    } catch (error) {

        console.error(
            "Send Message Error:",
            error
        );


        res.status(500).json({
            message: "Server error"
        });

    }

};

// GET PRIVATE MESSAGE HISTORY

export const getPrivateMessages = async (req, res) => {

    try {

        const currentUserId = req.user.id;

        const otherUserId = req.params.userId;

        // Validate user ID
        if (!otherUserId) {

            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });

        }

        // Get private chat messages
        const [messages] = await db.query(
            `
            SELECT
                m.id,
                m.sender_id,
                m.receiver_id,
                m.message,
                m.created_at,

                sender.username AS sender_username,

                receiver.username AS receiver_username

            FROM messages m

            JOIN users sender
                ON m.sender_id = sender.id

            JOIN users receiver
                ON m.receiver_id = receiver.id

            WHERE
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

            ORDER BY m.created_at ASC
            `,
            [
                currentUserId,
                otherUserId,
                otherUserId,
                currentUserId
            ]
        );

        return res.status(200).json({

            success: true,

            count: messages.length,

            messages: messages

        });

    } catch (error) {

        console.error(
            "Get Private Messages Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message: "Failed to load private messages"

        });

    }

};