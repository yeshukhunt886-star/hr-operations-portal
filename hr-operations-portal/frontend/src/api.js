const TOKEN_KEY = "hr_ops_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "";

export async function api(
  path,
  { method = "GET", body, headers } = {}
) {
  const token = getToken();

  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...headers,
    },
    body: body
      ? JSON.stringify(body)
      : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(
      data.error ||
        data.message ||
        "Request failed"
    );

    err.code = data.code;
    err.status = res.status;

    throw err;
  }

  return data;
}

/* =========================================================
   NOTIFICATIONS
   ========================================================= */

/**
 * Get current user's notifications
 */
export async function getNotifications({
  unreadOnly = false,
  page = 1,
  limit = 20,
} = {}) {
  const params = new URLSearchParams({
    unreadOnly: String(unreadOnly),
    page: String(page),
    limit: String(limit),
  });

  return api(`/api/notifications?${params.toString()}`);
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount() {
  return api("/api/notifications/unread-count");
}

/**
 * Mark one notification as read
 */
export async function markNotificationRead(notificationId) {
  return api(`/api/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead() {
  return api("/api/notifications/read-all", {
    method: "PATCH",
  });
}