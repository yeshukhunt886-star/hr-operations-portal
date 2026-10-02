import { useEffect, useState } from "react";
import api from "../services/api";
import { socket } from "../services/socket";
import MessageInput from "./MessageInput";

export default function ChatWindow({
  conversation,
}) {
  const [messages, setMessages] =
    useState([]);

  const [typingUser, setTypingUser] =
    useState(null);

  const currentUser = JSON.parse(
    localStorage.getItem("chat_user") || "null"
  );

  useEffect(() => {
    if (!conversation) {
      setMessages([]);
      return;
    }

    const conversationId =
      conversation.id;

    async function loadMessages() {
      try {
        const response =
          await api.get(
            `/messages/${conversationId}`
          );

        setMessages(
          response.data.messages || []
        );
      } catch (error) {
        console.error(
          "Load messages error:",
          error
        );
      }
    }

    loadMessages();

    // Join Socket.IO room
    socket.emit(
      "conversation:join",
      conversationId,
      (response) => {
        if (!response?.success) {
          console.error(
            response?.message
          );
        }
      }
    );

    function handleNewMessage(message) {
      if (
        message.conversationId !==
        conversationId
      ) {
        return;
      }

      setMessages((previous) => {
        const alreadyExists =
          previous.some(
            (item) =>
              item.id === message.id
          );

        if (alreadyExists) {
          return previous;
        }

        return [...previous, message];
      });
    }

    function handleTypingStart(data) {
      if (
        data.conversationId ===
        conversationId
      ) {
        if (
          data.userId !==
          currentUser?.id
        ) {
          setTypingUser(data.userId);
        }
      }
    }

    function handleTypingStop(data) {
      if (
        data.conversationId ===
        conversationId
      ) {
        setTypingUser(null);
      }
    }

    socket.on(
      "message:new",
      handleNewMessage
    );

    socket.on(
      "typing:start",
      handleTypingStart
    );

    socket.on(
      "typing:stop",
      handleTypingStop
    );

    return () => {
      socket.off(
        "message:new",
        handleNewMessage
      );

      socket.off(
        "typing:start",
        handleTypingStart
      );

      socket.off(
        "typing:stop",
        handleTypingStop
      );
    };
  }, [conversation]);

  if (!conversation) {
    return (
      <div className="chat-empty">
        <h2>Select a conversation</h2>
        <p>
          Choose a chat to start
          messaging.
        </p>
      </div>
    );
  }

  const otherMember =
    conversation.members.find(
      (member) =>
        member.userId !== currentUser?.id
    );

  const otherUser =
    otherMember?.user;

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="avatar">
          {otherUser?.name
            ?.charAt(0)
            .toUpperCase()}
        </div>

        <div>
          <h3>
            {otherUser?.name ||
              "Unknown User"}
          </h3>

          <span>
            {typingUser
              ? "typing..."
              : otherUser?.status ===
                "ONLINE"
              ? "Online"
              : "Offline"}
          </span>
        </div>
      </div>

      <div className="messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            No messages yet.
          </div>
        ) : (
          messages.map((message) => {
            const isMine =
              message.senderId ===
              currentUser?.id;

            return (
              <div
                key={message.id}
                className={`message-row ${
                  isMine
                    ? "mine"
                    : "other"
                }`}
              >
                <div className="message-bubble">
                  <p>
                    {message.content}
                  </p>

                  <small>
                    {message.isEdited
                      ? "Edited"
                      : ""}
                  </small>
                </div>
              </div>
            );
          })
        )}
      </div>

      <MessageInput
        conversationId={
          conversation.id
        }
      />
    </div>
  );
}