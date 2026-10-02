import { useEffect, useState } from "react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../api.js";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadNotifications() {
    try {
      setLoading(true);
      setError("");

      const data = await getNotifications({
        page: 1,
        limit: 50,
      });

      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function handleMarkRead(notificationId) {
    try {
      await markNotificationRead(notificationId);

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                isRead: true,
                readAt: new Date().toISOString(),
              }
            : notification
        )
      );

      setUnreadCount((current) => Math.max(current - 1, 0));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      setError(err.message || "Failed to mark notification as read");
    }
  }

  async function handleMarkAllRead() {
    try {
      setActionLoading(true);
      setError("");

      await markAllNotificationsRead();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt || new Date().toISOString(),
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      setError(err.message || "Failed to mark all notifications as read");
    } finally {
      setActionLoading(false);
    }
  }

  function formatDate(dateValue) {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function getNotificationType(type) {
    switch (type) {
      case "LEAVE_APPROVED":
        return "Leave Approved";

      case "LEAVE_REJECTED":
        return "Leave Rejected";

      case "LEAVE":
        return "Leave";

      case "PAYROLL":
        return "Payroll";

      case "ATTENDANCE":
        return "Attendance";

      case "GENERAL":
      default:
        return "General";
    }
  }

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
            }}
          >
            Notifications
          </h1>

          <p
            style={{
              margin: "6px 0 0",
              color: "#666",
            }}
          >
            {unreadCount === 0
              ? "You have no unread notifications."
              : `You have ${unreadCount} unread notification${
                  unreadCount === 1 ? "" : "s"
                }.`}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={loadNotifications}
            disabled={loading}
            style={{
              padding: "9px 14px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              background: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={actionLoading || unreadCount === 0}
            style={{
              padding: "9px 14px",
              border: "none",
              borderRadius: "6px",
              background:
                actionLoading || unreadCount === 0 ? "#aaa" : "#2563eb",
              color: "#fff",
              cursor:
                actionLoading || unreadCount === 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {actionLoading ? "Updating..." : "Mark All as Read"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 14px",
            borderRadius: "6px",
            background: "#fee2e2",
            color: "#991b1b",
            border: "1px solid #fecaca",
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "#666",
          }}
        >
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        /* Empty state */
        <div
          style={{
            padding: "50px 20px",
            textAlign: "center",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            background: "#fff",
          }}
        >
          <div
            style={{
              fontSize: "42px",
              marginBottom: "12px",
            }}
          >
            🔔
          </div>

          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "20px",
            }}
          >
            No Notifications
          </h2>

          <p
            style={{
              margin: 0,
              color: "#666",
            }}
          >
            You don't have any notifications yet.
          </p>
        </div>
      ) : (
        /* Notification list */
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {notifications.map((notification) => (
            <div
              key={notification.id}
              style={{
                padding: "18px",
                borderRadius: "10px",
                border: notification.isRead
                  ? "1px solid #e5e7eb"
                  : "1px solid #93c5fd",
                background: notification.isRead ? "#fff" : "#eff6ff",
                boxShadow: notification.isRead
                  ? "none"
                  : "0 2px 6px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "16px",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "7px",
                      flexWrap: "wrap",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "17px",
                      }}
                    >
                      {notification.title}
                    </h3>

                    {!notification.isRead && (
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "999px",
                          background: "#2563eb",
                          color: "#fff",
                          fontSize: "11px",
                          fontWeight: "600",
                        }}
                      >
                        NEW
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      margin: "0 0 10px",
                      color: "#444",
                      lineHeight: "1.5",
                    }}
                  >
                    {notification.message}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                      fontSize: "13px",
                      color: "#777",
                    }}
                  >
                    <span>
                      Type: {getNotificationType(notification.type)}
                    </span>

                    <span>•</span>

                    <span>
                      {formatDate(notification.createdAt)}
                    </span>
                  </div>
                </div>

                {!notification.isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(notification.id)}
                    style={{
                      padding: "7px 11px",
                      border: "1px solid #2563eb",
                      borderRadius: "6px",
                      background: "#fff",
                      color: "#2563eb",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}