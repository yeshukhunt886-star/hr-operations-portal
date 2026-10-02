
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { getUnreadNotificationCount } from "../api.js";

const LINKS = [
  {
    to: "/",
    label: "Overview",
    roles: ["EMPLOYEE", "MANAGER", "HR", "ADMIN"],
  },
  {
    to: "/attendance",
    label: "Attendance",
    roles: ["EMPLOYEE", "MANAGER", "HR", "ADMIN"],
  },
  {
    to: "/leave",
    label: "Leave",
    roles: ["EMPLOYEE", "MANAGER", "HR", "ADMIN"],
  },
  {
    to: "/payslips",
    label: "Payslips",
    roles: ["EMPLOYEE", "MANAGER", "HR", "ADMIN"],
  },
  {
    to: "/approvals",
    label: "Approvals",
    roles: ["MANAGER", "HR", "ADMIN"],
  },
  {
    to: "/employees",
    label: "People",
    roles: ["MANAGER", "HR", "ADMIN"],
  },
  {
    to: "/payroll",
    label: "Payroll",
    roles: ["HR", "ADMIN"],
  },
  {
    to: "/reports",
    label: "Reports",
    roles: ["MANAGER", "HR", "ADMIN"],
  },
  {
    to: "/holidays",
    label: "Holidays",
    roles: ["HR", "ADMIN"],
  },
  {
    to: "/audit",
    label: "Audit",
    roles: ["HR", "ADMIN"],
  },
  {
    to: "/notifications",
    label: "Notifications",
    roles: ["EMPLOYEE", "MANAGER", "HR", "ADMIN"],
  },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const role = user.role;

  const name = user.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user.email;

  useEffect(() => {
    let active = true;

    async function loadUnreadCount() {
      try {
        const data = await getUnreadNotificationCount();

        if (active) {
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error("Failed to load notification count:", error);
      }
    }

    loadUnreadCount();

    const interval = setInterval(loadUnreadCount, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="shell">
      <aside className="nav">
        <div className="brand">
          <span className="mark">NL</span>

          <div>
            <strong>Northline</strong>
            <small>HR operations</small>
          </div>
        </div>

        <nav>
          {LINKS.filter((l) => l.roles.includes(role)).map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  gap: "8px",
                }}
              >
                <span>{l.label}</span>

                {l.to === "/notifications" && unreadCount > 0 && (
                  <span
                    style={{
                      minWidth: "20px",
                      height: "20px",
                      padding: "0 6px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "999px",
                      background: "#dc2626",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: "700",
                    }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="who">
          <div>
            <strong>{name}</strong>
            <small>{role}</small>
          </div>

          <button
            type="button"
            className="ghost"
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="stage">
        <Outlet />
      </main>
    </div>
  );
}