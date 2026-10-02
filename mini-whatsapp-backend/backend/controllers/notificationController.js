import db from "../config/db.js";

// ==========================================
// GET ALL NOTIFICATIONS
// GET /api/notifications
// ==========================================

export const getNotifications = async (req, res) => {
try {

    const userId = Number(req.user.id);

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const [notifications] = await db.query(
        `
        SELECT
            n.id,
            n.user_id,
            n.sender_id,
            n.message_id,
            n.type,
            n.title,
            n.message,
            n.is_read,
            n.created_at,

            u.username AS sender_username

        FROM notifications n

        LEFT JOIN users u
            ON u.id = n.sender_id

        WHERE n.user_id = ?

        ORDER BY
            n.created_at DESC,
            n.id DESC
        `,
        [userId]
    );

    console.log(
        "NOTIFICATIONS FETCHED:",
        notifications.length
    );

    return res.status(200).json({
        success: true,
        notifications
    });

} catch (error) {

    console.error(
        "Get Notifications Error:",
        error
    );

    return res.status(500).json({
        success: false,
        message: "Failed to get notifications"
    });

}
};

// ==========================================
// MARK ONE NOTIFICATION AS READ
// PUT /api/notifications/:id/read
// ==========================================

export const markNotificationAsRead = async (
req,
res
) => {

try {

    const notificationId =
        Number(req.params.id);

    const userId =
        Number(req.user.id);


    if (!notificationId) {
        return res.status(400).json({
            success: false,
            message: "Notification ID is required"
        });
    }


    const [result] = await db.query(
        `
        UPDATE notifications

        SET
            is_read = 1

        WHERE
            id = ?

            AND

            user_id = ?
        `,
        [
            notificationId,
            userId
        ]
    );


    return res.status(200).json({
        success: true,
        message: "Notification marked as read",
        affectedRows:
            result.affectedRows
    });


} catch (error) {

    console.error(
        "Mark Notification Read Error:",
        error
    );

    return res.status(500).json({
        success: false,
        message: "Failed to mark notification as read"
    });

}

};

// ==========================================
// MARK ALL NOTIFICATIONS AS READ
// PUT /api/notifications/read-all
// ==========================================

export const markAllNotificationsAsRead = async (
req,
res
) => {

try {

    const userId =
        Number(req.user.id);


    await db.query(
        `
        UPDATE notifications

        SET
            is_read = 1

        WHERE
            user_id = ?

            AND

            is_read = 0
        `,
        [
            userId
        ]
    );


    return res.status(200).json({
        success: true,
        message:
            "All notifications marked as read"
    });


} catch (error) {

    console.error(
        "Mark All Notifications Read Error:",
        error
    );

    return res.status(500).json({
        success: false,
        message:
            "Failed to mark all notifications as read"
    });

}

};

// ==========================================
// DELETE ONE NOTIFICATION
// DELETE /api/notifications/:id
// ==========================================

export const deleteNotification = async (
req,
res
) => {

try {

    const notificationId =
        Number(req.params.id);

    const userId =
        Number(req.user.id);


    if (!notificationId) {
        return res.status(400).json({
            success: false,
            message:
                "Notification ID is required"
        });
    }


    const [result] = await db.query(
        `
        DELETE FROM notifications

        WHERE
            id = ?

            AND

            user_id = ?
        `,
        [
            notificationId,
            userId
        ]
    );


    return res.status(200).json({
        success: true,
        message:
            "Notification deleted",
        affectedRows:
            result.affectedRows
    });


} catch (error) {

    console.error(
        "Delete Notification Error:",
        error
    );

    return res.status(500).json({
        success: false,
        message:
            "Failed to delete notification"
    });

}
};

// ==========================================
// DELETE ALL NOTIFICATIONS
// DELETE /api/notifications
// ==========================================

export const clearNotifications = async (
req,
res
) => {

try {

    const userId =
        Number(req.user.id);


    await db.query(
        `
        DELETE FROM notifications

        WHERE
            user_id = ?
        `,
        [
            userId
        ]
    );


    return res.status(200).json({
        success: true,
        message:
            "All notifications cleared"
    });


} catch (error) {

    console.error(
        "Clear Notifications Error:",
        error
    );

    return res.status(500).json({
        success: false,
        message:
            "Failed to clear notifications"
    });

}

};
