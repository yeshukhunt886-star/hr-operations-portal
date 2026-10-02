import { useState } from "react";
import api from "../services/api";

export default function UserSearch({
  onConversationCreated,
}) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  async function searchUsers(value) {
    setQuery(value);

    if (!value.trim()) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);

      const response = await api.get(
        `/users/search?q=${encodeURIComponent(
          value
        )}`
      );

      setUsers(response.data.users || []);
    } catch (error) {
      console.error(
        "Search users error:",
        error
      );

      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function startConversation(userId) {
    try {
      const response = await api.post(
        "/conversations",
        {
          userId,
        }
      );

      setUsers([]);
      setQuery("");

      onConversationCreated(
        response.data.conversation
      );
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to create conversation"
      );
    }
  }

  return (
    <div className="user-search">
      <input
        type="text"
        placeholder="Search users..."
        value={query}
        onChange={(e) =>
          searchUsers(e.target.value)
        }
      />

      {loading && (
        <div className="search-loading">
          Searching...
        </div>
      )}

      {users.length > 0 && (
        <div className="search-results">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() =>
                startConversation(user.id)
              }
            >
              <div className="avatar">
                {user.name
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <strong>
                  {user.name}
                </strong>

                <span>
                  {user.email}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}