import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";
import {
  connectSocket,
  disconnectSocket,
  socket,
} from "../services/socket";

import ConversationList from "../components/ConversationList";
import UserSearch from "../components/UserSearch";
import ChatWindow from "../components/ChatWindow";

export default function Chat() {
  const navigate = useNavigate();

  const [conversations, setConversations] =
    useState([]);

  const [
    selectedConversation,
    setSelectedConversation,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const currentUser = JSON.parse(
    localStorage.getItem("chat_user") || "null"
  );

  useEffect(() => {
    const token =
      localStorage.getItem("chat_token");

    if (!token) {
      navigate("/");
      return;
    }

    connectSocket();

    loadConversations();

    return () => {
      disconnectSocket();
    };
  }, []);

  async function loadConversations() {
    try {
      setLoading(true);

      const response =
        await api.get("/conversations");

      const data =
        response.data.conversations || [];

      setConversations(data);

      if (data.length > 0) {
        setSelectedConversation(
          data[0]
        );
      }
    } catch (error) {
      console.error(
        "Load conversations error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleConversationCreated(
    conversation
  ) {
    await loadConversations();

    setSelectedConversation(
      conversation
    );
  }

  function logout() {
    disconnectSocket();

    localStorage.removeItem(
      "chat_token"
    );

    localStorage.removeItem(
      "chat_user"
    );

    navigate("/");
  }

  if (loading) {
    return (
      <div className="loading-page">
        Loading chat...
      </div>
    );
  }

  return (
    <div className="chat-page">
      <aside className="sidebar">
        <div className="profile-header">
          <div className="avatar">
            {currentUser?.name
              ?.charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <strong>
              {currentUser?.name}
            </strong>

            <span>
              {currentUser?.email}
            </span>
          </div>

          <button
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>
        </div>

        <UserSearch
          onConversationCreated={
            handleConversationCreated
          }
        />

        <ConversationList
          conversations={
            conversations
          }
          selectedConversation={
            selectedConversation
          }
          onSelect={
            setSelectedConversation
          }
        />
      </aside>

      <main className="main-chat">
        <ChatWindow
          conversation={
            selectedConversation
          }
        />
      </main>
    </div>
  );
}