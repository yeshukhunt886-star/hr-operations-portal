import { useEffect, useRef, useState } from "react";
import { socket } from "../services/socket";

export default function MessageInput({
  conversationId,
}) {
  const [content, setContent] = useState("");

  const typingTimeout = useRef(null);

  function handleTyping(e) {
    const value = e.target.value;

    setContent(value);

    if (!conversationId) {
      return;
    }

    socket.emit(
      "typing:start",
      conversationId
    );

    clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      socket.emit(
        "typing:stop",
        conversationId
      );
    }, 800);
  }

  function sendMessage(e) {
    e.preventDefault();

    const text = content.trim();

    if (!text || !conversationId) {
      return;
    }

    if (!socket.connected) {
      alert(
        "Socket is not connected"
      );
      return;
    }

    socket.emit(
      "message:send",
      {
        conversationId,
        content: text,
        messageType: "TEXT",
      },
      (response) => {
        if (!response?.success) {
          alert(
            response?.message ||
              "Failed to send message"
          );

          return;
        }

        setContent("");

        socket.emit(
          "typing:stop",
          conversationId
        );
      }
    );
  }

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeout.current);
    };
  }, []);

  return (
    <form
      className="message-input"
      onSubmit={sendMessage}
    >
      <input
        type="text"
        placeholder="Type a message..."
        value={content}
        onChange={handleTyping}
      />

      <button type="submit">
        Send
      </button>
    </form>
  );
}