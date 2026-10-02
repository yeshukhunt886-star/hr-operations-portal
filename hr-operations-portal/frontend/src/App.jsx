
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import { AppShell } from "./layout/AppShell.jsx";
import { Login } from "./pages/Login.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { Attendance } from "./pages/Attendance.jsx";
import { Leave } from "./pages/Leave.jsx";
import { Approvals } from "./pages/Approvals.jsx";
import { Employees } from "./pages/Employees.jsx";
import { Payroll } from "./pages/Payroll.jsx";
import { Reports } from "./pages/Reports.jsx";
import { Holidays } from "./pages/Holidays.jsx";
import { Audit } from "./pages/Audit.jsx";
import { Payslips } from "./pages/Payslips.jsx";
import Notifications from "./pages/Notifications.jsx";

function Guard({ children }) {
  const { user, ready } = useAuth();

  if (!ready) {
    return <div className="boot">Loading workspace…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <Guard>
            <AppShell />
          </Guard>
        }
      >
        <Route index element={<Dashboard />} />

        <Route path="attendance" element={<Attendance />} />

        <Route path="leave" element={<Leave />} />

        <Route path="payslips" element={<Payslips />} />

        <Route path="approvals" element={<Approvals />} />

        <Route path="employees" element={<Employees />} />

        <Route path="payroll" element={<Payroll />} />

        <Route path="reports" element={<Reports />} />

        <Route path="holidays" element={<Holidays />} />

        <Route path="audit" element={<Audit />} />

        <Route path="notifications" element={<Notifications />} />
      </Route>
    </Routes>
  );
}
