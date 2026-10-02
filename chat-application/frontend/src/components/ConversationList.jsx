
export default function ConversationList({
  conversations,
  selectedConversation,
  onSelect,
}) {
  const currentUser = JSON.parse(
    localStorage.getItem("chat_user") || "null"
  );

  return (
    <div className="conversation-list">
      <div className="conversation-header">
        <h2>Chats</h2>
      </div>

      {conversations.length === 0 ? (
        <p className="empty">
          No conversations
        </p>
      ) : (
        conversations.map((conversation) => {
          const otherMember =
            conversation.members.find(
              (member) =>
                member.userId !== currentUser?.id
            );

          const otherUser =
            otherMember?.user;

          const lastMessage =
            conversation.messages?.[0];

          const unreadCount =
            conversation.unreadCount || 0;

          return (
            <button
              key={conversation.id}
              className={`conversation-item ${
                selectedConversation?.id ===
                conversation.id
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                onSelect(conversation)
              }
            >
              <div className="avatar">
                {otherUser?.name
                  ?.charAt(0)
                  .toUpperCase()}
              </div>

              <div className="conversation-info">
                <strong>
                  {otherUser?.name ||
                    "Unknown User"}
                </strong>

                <span>
                  {lastMessage?.content ||
                    "No messages yet"}
                </span>
              </div>

              <div className="conversation-right">
                <div
                  className={`status-dot ${
                    otherUser?.status ===
                    "ONLINE"
                      ? "online"
                      : ""
                  }`}
                />

                {unreadCount > 0 && (
                  <span className="unread-badge">
                    {unreadCount > 99
                      ? "99+"
                      : unreadCount}
                  </span>
                )}
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
