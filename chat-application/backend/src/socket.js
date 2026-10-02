const prisma = require("./prisma");
const socketAuth = require("./middleware/socketAuth");

function initializeSocket(io) {
  // ========================================
  // SOCKET AUTHENTICATION
  // ========================================

  io.use(socketAuth);

  // ========================================
  // CONNECTION
  // ========================================

  io.on("connection", async (socket) => {
    const userId = socket.user.id;

    console.log(
      `Socket connected: ${socket.id} | User: ${userId}`
    );

    // ========================================
    // UPDATE USER ONLINE
    // ========================================

    try {
      await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          status: "ONLINE",
          lastSeen: null,
        },
      });

      socket.broadcast.emit("user:online", {
        userId,
      });
    } catch (error) {
      console.error(
        "Failed to update online status:",
        error
      );
    }

    // ========================================
    // JOIN CONVERSATION ROOM
    // ========================================

    socket.on(
      "conversation:join",
      async (conversationId, callback) => {
        try {
          const parsedConversationId =
            Number(conversationId);

          if (
            !Number.isInteger(parsedConversationId) ||
            parsedConversationId <= 0
          ) {
            return callback?.({
              success: false,
              message: "Invalid conversation ID",
            });
          }

          // Check membership
          const conversation =
            await prisma.conversation.findFirst({
              where: {
                id: parsedConversationId,
                members: {
                  some: {
                    userId,
                  },
                },
              },
              select: {
                id: true,
              },
            });

          if (!conversation) {
            return callback?.({
              success: false,
              message:
                "Conversation not found or access denied",
            });
          }

          const roomName =
            `conversation:${parsedConversationId}`;

          socket.join(roomName);

          console.log(
            `User ${userId} joined ${roomName}`
          );

          callback?.({
            success: true,
            message: "Joined conversation",
            conversationId: parsedConversationId,
          });
        } catch (error) {
          console.error(
            "Join conversation error:",
            error
          );

          callback?.({
            success: false,
            message: "Failed to join conversation",
          });
        }
      }
    );

    // ========================================
    // SEND MESSAGE
    // ========================================

    socket.on(
      "message:send",
      async (data, callback) => {
        try {
          const {
            conversationId,
            content,
            messageType = "TEXT",
            fileUrl,
          } = data || {};

          const parsedConversationId =
            Number(conversationId);

          // Validate conversation ID
          if (
            !Number.isInteger(parsedConversationId) ||
            parsedConversationId <= 0
          ) {
            return callback?.({
              success: false,
              message: "Valid conversationId is required",
            });
          }

          // Validate message type
          const allowedMessageTypes = [
            "TEXT",
            "IMAGE",
            "FILE",
          ];

          if (
            !allowedMessageTypes.includes(messageType)
          ) {
            return callback?.({
              success: false,
              message: "Invalid message type",
            });
          }

          // Validate text content
          if (messageType === "TEXT") {
            if (
              typeof content !== "string" ||
              !content.trim()
            ) {
              return callback?.({
                success: false,
                message: "Message content is required",
              });
            }
          }

          // Validate file URL
          if (
            (messageType === "IMAGE" ||
              messageType === "FILE") &&
            (!fileUrl ||
              typeof fileUrl !== "string")
          ) {
            return callback?.({
              success: false,
              message:
                "fileUrl is required for IMAGE or FILE messages",
            });
          }

          // ========================================
          // CHECK MEMBERSHIP
          // ========================================

          const conversation =
            await prisma.conversation.findFirst({
              where: {
                id: parsedConversationId,
                members: {
                  some: {
                    userId,
                  },
                },
              },
              select: {
                id: true,
              },
            });

          if (!conversation) {
            return callback?.({
              success: false,
              message:
                "Conversation not found or access denied",
            });
          }

          // ========================================
          // SAVE MESSAGE
          // ========================================

          const message =
            await prisma.message.create({
              data: {
                conversationId:
                  parsedConversationId,

                senderId: userId,

                content:
                  typeof content === "string"
                    ? content.trim()
                    : null,

                messageType,

                fileUrl:
                  typeof fileUrl === "string"
                    ? fileUrl.trim()
                    : null,
              },

              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    profileImage: true,
                  },
                },
              },
            });

          // ========================================
          // UPDATE CONVERSATION
          // ========================================

          await prisma.conversation.update({
            where: {
              id: parsedConversationId,
            },
            data: {
              updatedAt: new Date(),
            },
          });

          const roomName =
            `conversation:${parsedConversationId}`;

          // ========================================
          // BROADCAST MESSAGE
          // ========================================

          io.to(roomName).emit(
            "message:new",
            message
          );

          // ========================================
          // SENDER ACKNOWLEDGEMENT
          // ========================================

          callback?.({
            success: true,
            message: "Message sent successfully",
            data: message,
          });
        } catch (error) {
          console.error(
            "Socket send message error:",
            error
          );

          callback?.({
            success: false,
            message: "Failed to send message",
          });
        }
      }
    );

    // ========================================
    // TYPING START
    // ========================================

    socket.on(
      "typing:start",
      async (conversationId) => {
        try {
          const parsedConversationId =
            Number(conversationId);

          if (
            !Number.isInteger(parsedConversationId)
          ) {
            return;
          }

          const conversation =
            await prisma.conversation.findFirst({
              where: {
                id: parsedConversationId,
                members: {
                  some: {
                    userId,
                  },
                },
              },
              select: {
                id: true,
              },
            });

          if (!conversation) {
            return;
          }

          socket
            .to(`conversation:${parsedConversationId}`)
            .emit("typing:start", {
              userId,
              conversationId:
                parsedConversationId,
            });
        } catch (error) {
          console.error(
            "Typing start error:",
            error
          );
        }
      }
    );

    // ========================================
    // TYPING STOP
    // ========================================

    socket.on(
      "typing:stop",
      async (conversationId) => {
        try {
          const parsedConversationId =
            Number(conversationId);

          if (
            !Number.isInteger(parsedConversationId)
          ) {
            return;
          }

          socket
            .to(`conversation:${parsedConversationId}`)
            .emit("typing:stop", {
              userId,
              conversationId:
                parsedConversationId,
            });
        } catch (error) {
          console.error(
            "Typing stop error:",
            error
          );
        }
      }
    );
    socket.on("message:read", async (data, callback) => {
  try {
    const messageId = Number(data?.messageId);

    if (!Number.isInteger(messageId)) {
      return callback?.({
        success: false,
        message: "Invalid message ID",
      });
    }

    const message = await prisma.message.findUnique({
      where: {
        id: messageId,
      },
      include: {
        conversation: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!message) {
      return callback?.({
        success: false,
        message: "Message not found",
      });
    }

    const isMember = message.conversation.members.some(
      (member) => member.userId === userId
    );

    if (!isMember) {
      return callback?.({
        success: false,
        message: "Not a conversation member",
      });
    }

    const read = await prisma.messageRead.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
      update: {
        readAt: new Date(),
      },
      create: {
        messageId,
        userId,
      },
    });

    const roomName = `conversation:${message.conversationId}`;

    io.to(roomName).emit("message:read", {
      messageId,
      userId,
      readAt: read.readAt,
    });

    callback?.({
      success: true,
      read,
    });
  } catch (error) {
    console.error("Socket message read error:", error);

    callback?.({
      success: false,
      message: "Failed to mark message as read",
    });
  }
});

    // ========================================
    // DISCONNECT
    // ========================================

    socket.on("disconnect", async () => {
      console.log(
        `Socket disconnected: ${socket.id} | User: ${userId}`
      );

      try {
        await prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            status: "OFFLINE",
            lastSeen: new Date(),
          },
        });

        socket.broadcast.emit("user:offline", {
          userId,
          lastSeen: new Date(),
        });
      } catch (error) {
        console.error(
          "Failed to update offline status:",
          error
        );
      }
    });
  });
}

module.exports = initializeSocket;