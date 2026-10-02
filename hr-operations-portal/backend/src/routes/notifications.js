import express from "express";

import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../services/notificationService.js";

export const notificationRouter = express.Router();

notificationRouter.get("/", async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const unreadOnly =
      String(req.query.unreadOnly).toLowerCase() === "true";
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await getNotifications({
      userId,
      unreadOnly,
      page,
      limit,
    });
    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

notificationRouter.get("/unread-count", async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const count = await getUnreadCount(userId);
    return res.json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    next(error);
  }
});

notificationRouter.patch("/read-all", async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await markAllAsRead(userId);
    return res.json({
      success: true,
      message: "All notifications marked as read",
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

notificationRouter.patch("/:id/read", async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const notificationId = req.params.id;
    const notification = await markAsRead({
      userId,
      notificationId,
    });
    return res.json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    next(error);
  }
});