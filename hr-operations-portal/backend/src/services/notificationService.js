import { prisma } from "../prisma.js";

export const createNotification = async ({
  userId,
  title,
  message,
  type = "GENERAL",
}) => {
  if (!userId) {
    throw new Error("userId is required");
  }

  if (!title) {
    throw new Error("Notification title is required");
  }

  if (!message) {
    throw new Error("Notification message is required");
  }

  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
    },
  });
};

export const createNotifications = async ({
  userIds,
  title,
  message,
  type = "GENERAL",
}) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return { count: 0 };
  }

  const uniqueUserIds = [...new Set(userIds)];

  return prisma.notification.createMany({
    data: uniqueUserIds.map((userId) => ({
      userId,
      title,
      message,
      type,
    })),
  });
};

export const getNotifications = async ({
  userId,
  unreadOnly = false,
  page = 1,
  limit = 20,
}) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const where = {userId,};

  if (unreadOnly) {
    where.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),

    prisma.notification.count({
      where,
    }),

    prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    }),
  ]);

  return {
    notifications,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
    unreadCount,
  };
};

export const getUnreadCount = async (userId) => {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
};

export const markAsRead = async ({ userId, notificationId }) => {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!notification) {
    const error = new Error("Notification not found");
    error.statusCode = 404;
    throw error;
  }

  if (notification.isRead) {
    return notification;
  }

  return prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
};

export const markAllAsRead = async (userId) => {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return {
    count: result.count,
  };
};