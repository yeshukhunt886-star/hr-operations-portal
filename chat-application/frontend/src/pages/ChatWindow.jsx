
import { useEffect, useRef, useState } from "react";
import api from "../services/api.js";
import { socket } from "../services/socket.js";

export default function ChatWindow({
  conversation,
  currentUser,
  onBack,
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");

  const messagesEndRef = useRef(null);

  const conversationId = conversation?.id;

  // Get other user / group name
  const otherMember = conversation?.members?.find(
    (member) => member.userId !== currentUser?.id
  );

  const chatTitle =
    conversation?.type === "GROUP"
      ? conversation?.name || "Group"
      : otherMember?.user?.name || "Chat";

  const otherUser = otherMember?.user;

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // Load messages
  const loadMessages = async () => {
    if (!conversationId) {
      return;
    }

    try {
      setLoading(true);

      const response = await api.get(
        `/messages/${conversationId}`
      );

      setMessages(response.data.messages || []);

      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error(
        "Load messages error:",
        error.response?.data || error.message
      );
    } finally {
      setLoading(false);
    }
  };

  // Mark received messages as read
  const markMessagesAsRead = (messageList) => {
    if (!currentUser?.id) {
      return;
    }

    messageList.forEach((message) => {
      if (message.senderId !== currentUser.id) {
        socket.emit("message:read", {
          messageId: message.id,
        });
      }
    });
  };

  // Open conversation
  useEffect(() => {
    if (!conversationId) {
      return;
    }

    loadMessages();

    socket.emit(
      "conversation:join",
      {
        conversationId,
      },
      (response) => {
        if (!response?.success) {
          console.error(
            "Conversation join error:",
            response?.message
          );
        }
      }
    );
  }, [conversationId]);

  // Socket events
  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const handleNewMessage = (message) => {
      if (message.conversationId !== conversationId) {
        return;
      }

      setMessages((previousMessages) => {
        const alreadyExists = previousMessages.some(
          (item) => item.id === message.id
        );

        if (alreadyExists) {
          return previousMessages;
        }

        return [...previousMessages, message];
      });

      setTimeout(() => {
        scrollToBottom();
      }, 50);

      // Automatically mark received message as read
      if (message.senderId !== currentUser.id) {
        socket.emit("message:read", {
          messageId: message.id,
        });
      }
    };

    const handleTypingStart = (data) => {
      if (data.conversationId !== conversationId) {
        return;
      }

      if (data.userId === currentUser.id) {
        return;
      }

      setTypingUser(data.userName || "Someone");
    };

    const handleTypingStop = (data) => {
      if (data.conversationId !== conversationId) {
        return;
      }

      setTypingUser(null);
    };

    const handleMessageRead = (data) => {
      setMessages((previousMessages) =>
        previousMessages.map((message) => {
          if (message.id !== data.messageId) {
            return message;
          }

          const existingReads = message.reads || [];

          const alreadyRead = existingReads.some(
            (read) => read.userId === data.userId
          );

          if (alreadyRead) {
            return message;
          }

          return {
            ...message,
            reads: [
              ...existingReads,
              {
                userId: data.userId,
                readAt: data.readAt,
              },
            ],
          };
        })
      );
    };

    const handleMessageUpdated = (updatedMessage) => {
      if (
        updatedMessage.conversationId &&
        updatedMessage.conversationId !== conversationId
      ) {
        return;
      }

      setMessages((previousMessages) =>
        previousMessages.map((message) =>
          message.id === updatedMessage.id
            ? {
                ...message,
                ...updatedMessage,
              }
            : message
        )
      );
    };

    const handleMessageDeleted = (deletedData) => {
      const deletedId =
        typeof deletedData === "object"
          ? deletedData.messageId
          : deletedData;

      setMessages((previousMessages) =>
        previousMessages.filter(
          (message) => message.id !== deletedId
        )
      );
    };

    socket.on("message:new", handleNewMessage);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    socket.on("message:read", handleMessageRead);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("message:deleted", handleMessageDeleted);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.off("message:read", handleMessageRead);
      socket.off(
        "message:updated",
        handleMessageUpdated
      );
      socket.off(
        "message:deleted",
        handleMessageDeleted
      );
    };
  }, [conversationId, currentUser?.id]);

  // Mark loaded messages as read
  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    markMessagesAsRead(messages);

    setTimeout(() => {
      scrollToBottom();
    }, 50);
  }, [messages.length]);

  // Send message
  const sendMessage = (event) => {
    event.preventDefault();

    const input = event.target.elements.message;
    const content = input.value.trim();

    if (!content || !conversationId) {
      return;
    }

    socket.emit(
      "message:send",
      {
        conversationId,
        content,
        messageType: "TEXT",
      },
      (response) => {
        if (!response?.success) {
          console.error(
            "Send message error:",
            response?.message
          );
          return;
        }

        input.value = "";
        socket.emit("typing:stop", {
          conversationId,
        });

        setTimeout(() => {
          scrollToBottom();
        }, 50);
      }
    );
  };

  // Typing
  const handleTyping = (event) => {
    const value = event.target.value.trim();

    if (!conversationId) {
      return;
    }

    if (value) {
      socket.emit("typing:start", {
        conversationId,
      });
    } else {
      socket.emit("typing:stop", {
        conversationId,
      });
    }
  };

  // Start editing
  const startEdit = (message) => {
    setEditingMessageId(message.id);
    setEditText(message.content || "");
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  // Save edit
  const saveEdit = async (messageId) => {
    const content = editText.trim();

    if (!content) {
      return;
    }

    try {
      const response = await api.put(
        `/messages/${messageId}`,
        {
          content,
        }
      );

      const updatedMessage =
        response.data.message;

      setMessages((previousMessages) =>
        previousMessages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                ...updatedMessage,
              }
            : message
        )
      );

      cancelEdit();
    } catch (error) {
      console.error(
        "Edit message error:",
        error.response?.data || error.message
      );
    }
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    const confirmed = window.confirm(
      "Delete this message?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/messages/${messageId}`);

      setMessages((previousMessages) =>
        previousMessages.filter(
          (message) => message.id !== messageId
        )
      );
    } catch (error) {
      console.error(
        "Delete message error:",
        error.response?.data || error.message
      );
    }
  };

  // Message status
  const getMessageStatus = (message) => {
    if (message.senderId !== currentUser.id) {
      return null;
    }

    const isRead = message.reads?.some(
      (read) => read.userId !== currentUser.id
    );

    if (isRead) {
      return "✓✓ Read";
    }

    if (message.deliveredAt) {
      return "✓✓";
    }

    return "✓";
  };

  if (!conversation) {
    return (
      <div className="chat-window empty-chat">
        <h2>Select a conversation</h2>
        <p>Choose a chat to start messaging.</p>
      </div>
    );
  }

  return (
    <section className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          {onBack && (
            <button
              type="button"
              className="mobile-back-button"
              onClick={onBack}
            >
              ←
            </button>
          )}

          <div className="chat-avatar">
            {chatTitle
              ?.charAt(0)
              ?.toUpperCase() || "C"}
          </div>

          <div>
            <h3>{chatTitle}</h3>

            {conversation.type === "GROUP" ? (
              <span>
                {conversation.members?.length || 0} members
              </span>
            ) : (
              <span
                className={
                  otherUser?.status === "ONLINE"
                    ? "online-text"
                    : "offline-text"
                }
              >
                {otherUser?.status === "ONLINE"
                  ? "Online"
                  : otherUser?.lastSeen
                  ? `Last seen ${new Date(
                      otherUser.lastSeen
                    ).toLocaleString()}`
                  : "Offline"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {loading ? (
          <div className="messages-loading">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-messages">
            <p>No messages yet.</p>
            <span>Send a message to start the conversation.</span>
          </div>
        ) : (
          messages.map((message) => {
            const isMine =
              message.senderId === currentUser.id;

            const status =
              getMessageStatus(message);

            const isEditing =
              editingMessageId === message.id;

            return (
              <div
                key={message.id}
                className={`message-row ${
                  isMine ? "message-row-mine" : ""
                }`}
              >
                <div
                  className={`message-bubble ${
                    isMine
                      ? "message-mine"
                      : "message-other"
                  }`}
                >
                  {/* Group sender */}
                  {conversation.type === "GROUP" &&
                    !isMine && (
                      <div className="message-sender">
                        {message.sender?.name ||
                          "User"}
                      </div>
                    )}

                  {isEditing ? (
                    <div className="message-edit-box">
                      <input
                        type="text"
                        value={editText}
                        onChange={(event) =>
                          setEditText(
                            event.target.value
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            saveEdit(message.id);
                          }

                          if (event.key === "Escape") {
                            cancelEdit();
                          }
                        }}
                        autoFocus
                      />

                      <div className="edit-actions">
                        <button
                          type="button"
                          onClick={() =>
                            saveEdit(message.id)
                          }
                        >
                          Save
                        </button>

                        <button
                          type="button"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {message.messageType ===
                        "IMAGE" &&
                      message.fileUrl ? (
                        <img
                          src={message.fileUrl}
                          alt="Message"
                          className="message-image"
                        />
                      ) : message.messageType ===
                        "FILE" &&
                      message.fileUrl ? (
                        <a
                          href={message.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open file
                        </a>
                      ) : (
                        <div className="message-content">
                          {message.content}
                        </div>
                      )}

                      <div className="message-meta">
                        <span>
                          {new Date(
                            message.createdAt
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        {message.isEdited && (
                          <span>Edited</span>
                        )}

                        {isMine && (
                          <span className="message-status">
                            {status}
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  {/* Own message actions */}
                  {isMine && !isEditing && (
                    <div className="message-actions">
                      <button
                        type="button"
                        onClick={() =>
                          startEdit(message)
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteMessage(message.id)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUser && (
        <div className="typing-indicator">
          {typingUser} is typing...
        </div>
      )}

      {/* Message input */}
      <form
        className="message-input-container"
        onSubmit={sendMessage}
      >
        <input
          type="text"
          name="message"
          placeholder="Type a message..."
          autoComplete="off"
          onChange={handleTyping}
        />

        <button type="submit">
          Send
        </button>
      </form>
    </section>
  );
}


// ### Important

// This `ChatWindow.jsx` expects your parent `Chat.jsx` to pass:

// ```jsx
// <ChatWindow
//   conversation={selectedConversation}
//   currentUser={currentUser}
//   onBack={() => setSelectedConversation(null)}
// />
// ```

// Also, your backend Socket.IO must emit these events if you want **real-time edit/delete**:

// ```text
// message:updated
// message:deleted
// ```

// Your existing REST edit/delete APIs will still work even before those Socket.IO events are added.

// ### Run

// After replacing the file:

// ```bat
// cd /d "D:\yeshu\all project\chat-application\frontend"
// npm run dev
// ```

// Then test:

// 1. Login as `employee@gmail.com`
// 2. Login as `admin@gmail.com`
// 3. Send message
// 4. Check `✓`
// 5. Open receiver chat → `✓✓ Read`
// 6. Edit own message
// 7. Delete own message
// 8. Check typing indicator
// 9. Check Online/Offline

// Next, the **`Chat.jsx` file should be updated** so the mobile back button and unread counts work correctly.
