import express from "express";

import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearNotifications
} from "../controllers/notificationController.js";

import authMiddleware
    from "../middleware/authMiddleware.js";


const router =
    express.Router();


// ==========================================
// GET NOTIFICATIONS
// GET /api/notifications
// ==========================================

router.get(
    "/",
    authMiddleware,
    getNotifications
);


// ==========================================
// MARK ONE READ
// PUT /api/notifications/:id/read
// ==========================================

router.put(
    "/:id/read",
    authMiddleware,
    markNotificationAsRead
);


// ==========================================
// MARK ALL READ
// PUT /api/notifications/read-all
// ==========================================

router.put(
    "/read-all",
    authMiddleware,
    markAllNotificationsAsRead
);


// ==========================================
// DELETE ONE
// DELETE /api/notifications/:id
// ==========================================

router.delete(
    "/:id",
    authMiddleware,
    deleteNotification
);


// ==========================================
// CLEAR ALL
// DELETE /api/notifications
// ==========================================

router.delete(
    "/",
    authMiddleware,
    clearNotifications
);


export default router;