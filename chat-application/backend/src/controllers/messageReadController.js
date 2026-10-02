const prisma = require("../prisma");

async function markMessageAsRead(req, res) {
  try {
    const userId = req.user.id;
    const messageId = Number(req.params.id);

    if (!Number.isInteger(messageId)) {
      return res.status(400).json({
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
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    const isMember = message.conversation.members.some(
      (member) => member.userId === userId
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this conversation",
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

    return res.status(200).json({
      success: true,
      message: "Message marked as read",
      read,
    });
  } catch (error) {
    console.error("Mark message read error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark message as read",
    });
  }
}

module.exports = {
  markMessageAsRead,
};
