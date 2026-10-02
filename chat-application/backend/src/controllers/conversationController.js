const prisma = require("../prisma");

// CREATE / GET DIRECT CONVERSATION
// POST /api/conversations
async function createDirectConversation(req, res) {
  try {
    const currentUserId = req.user.id;
    const { userId } = req.body;

    const targetUserId = Number(userId);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid userId is required",
      });
    }

    if (targetUserId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot create a conversation with yourself",
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId, },
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
        status: true,
        lastSeen: true,
      },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const existingConversation =
      await prisma.conversation.findFirst({
        where: {
          type: "DIRECT",
          AND: [
            {
              members: {
                some: { userId: currentUserId, },
              },
            },
            {
              members: {
                some: { userId: targetUserId,},
              },
            },
          ],
        },
        include: {
          members: {
            select: {
              userId: true,
              joinedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profileImage: true,
                  status: true,
                  lastSeen: true,
                },
              },
            },
          },
        },
      });

    if (existingConversation) {
      return res.status(200).json({
        success: true,
        message: "Conversation already exists",
        conversation: existingConversation,
        existing: true,
      });
    }

    const conversation = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        members: {
          create: [
            { userId: currentUserId, },
            { userId: targetUserId, },
          ],
        },
      },
      include: {
        members: {
          select: {
            userId: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImage: true,
                status: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Conversation created successfully",
      conversation,
      existing: false,
    });
  } catch (error) {
    console.error("Create conversation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create conversation",
    });
  }
}

// GET MY CONVERSATIONS
// GET /api/conversations
async function getMyConversations(req, res) {
  try {
    const currentUserId = req.user.id;
    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: {
            userId: currentUserId,
          },
        },
      },

      include: {
        members: {
          select: {
            userId: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImage: true,
                status: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc",},
          take: 1,
          select: {
            id: true,
            senderId: true,
            content: true,
            messageType: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc", },
    });

    // ADD UNREAD MESSAGE COUNT
    const conversationsWithUnreadCount =
      await Promise.all(
        conversations.map(async (conversation) => {
          const unreadCount =
            await prisma.message.count({
              where: {
                conversationId: conversation.id,
                // Do not count messages sent by me
                senderId: { not: currentUserId, },
                // Count only messages that I have NOT read
                reads: {
                  none: { userId: currentUserId,},
                },
              },
            });

          return {...conversation,unreadCount,
          };
        })
      );
    return res.status(200).json({
      success: true,
      count: conversationsWithUnreadCount.length,
      conversations: conversationsWithUnreadCount,
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get conversations",
    });
  }
}

// GET SINGLE CONVERSATION
// GET /api/conversations/:id
async function getConversationById(req, res) {
  try {
    const currentUserId = req.user.id;
    const conversationId = Number(req.params.id);
    if (!Number.isInteger(conversationId) ||conversationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }
    const conversation =await prisma.conversation.findFirst({
        where: {id: conversationId,
          members: {some: {userId: currentUserId,},},
        },
        include: {
          members: {
            select: {
              userId: true,
              joinedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profileImage: true,
                  status: true,
                  lastSeen: true,
                },
              },
            },
          },
          messages: {
            orderBy: {createdAt: "asc",},
            select: {
              id: true,
              senderId: true,
              content: true,
              messageType: true,
              fileUrl: true,
              isEdited: true,
              deliveredAt: true,
              createdAt: true,
              updatedAt: true,
              reads: {
                select: {userId: true,readAt: true,},
              },
            },
          },
        },
      });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("Get conversation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get conversation",
    });
  }
}

module.exports = {
  createDirectConversation,
  getMyConversations,
  getConversationById,
};
