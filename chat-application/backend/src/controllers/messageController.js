const prisma = require("../prisma");

// ========================================
// CREATE MESSAGE
// POST /api/messages
// ========================================
async function createMessage(req, res) {
  try {
    const senderId = req.user.id;

    const {
      conversationId,
      content,
      messageType = "TEXT",
      fileUrl,
    } = req.body;

    // ========================================
    // VALIDATE CONVERSATION ID
    // ========================================

    const parsedConversationId = Number(conversationId);

    if (
      !Number.isInteger(parsedConversationId) ||
      parsedConversationId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid conversationId is required",
      });
    }

    // ========================================
    // VALIDATE MESSAGE TYPE
    // ========================================

    const allowedMessageTypes = [
      "TEXT",
      "IMAGE",
      "FILE",
    ];

    if (!allowedMessageTypes.includes(messageType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message type",
      });
    }

    // ========================================
    // VALIDATE CONTENT
    // ========================================

    if (messageType === "TEXT") {
      if (
        typeof content !== "string" ||
        !content.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Message content is required",
        });
      }
    }

    // ========================================
    // VALIDATE FILE URL
    // ========================================

    if (
      (messageType === "IMAGE" || messageType === "FILE") &&
      (!fileUrl || typeof fileUrl !== "string")
    ) {
      return res.status(400).json({
        success: false,
        message: "fileUrl is required for IMAGE or FILE messages",
      });
    }

    // ========================================
    // CHECK CONVERSATION MEMBERSHIP
    // ========================================

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: parsedConversationId,
        members: {
          some: {
            userId: senderId,
          },
        },
      },
      select: {
        id: true,
        type: true,
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found or access denied",
      });
    }

    // ========================================
    // CREATE MESSAGE
    // ========================================

    const message = await prisma.message.create({
      data: {
        conversationId: parsedConversationId,
        senderId,
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
        reads: {
          select: {
            userId: true,
            readAt: true,
          },
        },
      },
    });

    // ========================================
    // UPDATE CONVERSATION TIMESTAMP
    // ========================================

    await prisma.conversation.update({
      where: {
        id: parsedConversationId,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Create message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
}

// ========================================
// GET CONVERSATION MESSAGES
// GET /api/messages/:conversationId
// ========================================
async function getMessages(req, res) {
  try {
    const userId = req.user.id;

    const conversationId = Number(
      req.params.conversationId
    );

    if (
      !Number.isInteger(conversationId) ||
      conversationId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    // ========================================
    // CHECK MEMBERSHIP
    // ========================================

    const conversation =
      await prisma.conversation.findFirst({
        where: {
          id: conversationId,
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
      return res.status(404).json({
        success: false,
        message: "Conversation not found or access denied",
      });
    }

    // ========================================
    // GET MESSAGES
    // ========================================

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        content: true,
        messageType: true,
        fileUrl: true,
        isEdited: true,
        createdAt: true,
        updatedAt: true,
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

    return res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error("Get messages error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get messages",
    });
  }
}

// ========================================
// UPDATE MESSAGE
// PUT /api/messages/:id
// ========================================
async function updateMessage(req, res) {
  try {
    const userId = req.user.id;
    const messageId = Number(req.params.id);

    const { content } = req.body;

    // ========================================
    // VALIDATE MESSAGE ID
    // ========================================

    if (
      !Number.isInteger(messageId) ||
      messageId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
    }

    // ========================================
    // VALIDATE CONTENT
    // ========================================

    if (
      typeof content !== "string" ||
      !content.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    // ========================================
    // FIND MESSAGE OWNED BY CURRENT USER
    // ========================================

    const existingMessage =
      await prisma.message.findFirst({
        where: {
          id: messageId,
          senderId: userId,
        },
      });

    if (!existingMessage) {
      return res.status(404).json({
        success: false,
        message: "Message not found or you are not the sender",
      });
    }

    // ========================================
    // UPDATE MESSAGE
    // ========================================

    const updatedMessage =
      await prisma.message.update({
        where: {
          id: messageId,
        },
        data: {
          content: content.trim(),
          isEdited: true,
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

    return res.status(200).json({
      success: true,
      message: "Message updated successfully",
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Update message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update message",
    });
  }
}

// ========================================
// DELETE MESSAGE
// DELETE /api/messages/:id
// ========================================
async function deleteMessage(req, res) {
  try {
    const userId = req.user.id;
    const messageId = Number(req.params.id);

    // ========================================
    // VALIDATE MESSAGE ID
    // ========================================

    if (
      !Number.isInteger(messageId) ||
      messageId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
    }

    // ========================================
    // FIND MESSAGE OWNED BY CURRENT USER
    // ========================================

    const existingMessage =
      await prisma.message.findFirst({
        where: {
          id: messageId,
          senderId: userId,
        },
      });

    if (!existingMessage) {
      return res.status(404).json({
        success: false,
        message: "Message not found or you are not the sender",
      });
    }

    // ========================================
    // DELETE MESSAGE
    // ========================================

    await prisma.message.delete({
      where: {
        id: messageId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Delete message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete message",
    });
  }
}

module.exports = {
  createMessage,
  getMessages,
  updateMessage,
  deleteMessage,
};