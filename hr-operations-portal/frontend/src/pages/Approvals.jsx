 import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export function Approvals() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    const data = await api("/api/leave/requests?status=PENDING");
    setRows(data.items || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function act(id, action) {
    setError("");
    try {
      await api(`/api/leave/requests/${id}/${action}`, { method: "POST", body: {} });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <header className="page-head">
        <div>
          <p className="eyebrow">Workflow</p>
          <h1>Leave approvals</h1>
        </div>
      </header>
      {error && <p className="alert">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Dates</th>
            <th>Days</th>
            <th>Reason</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={5}>No pending requests in your scope.</td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                {r.employee?.firstName} {r.employee?.lastName} ({r.employee?.employeeCode})
              </td>
              <td>
                {String(r.startDate).slice(0, 10)} → {String(r.endDate).slice(0, 10)}
              </td>
              <td>{Number(r.daysCharged)}</td>
              <td>{r.reason}</td>
              <td className="actions">
                <button type="button" onClick={() => act(r.id, "approve")}>
                  Approve
                </button>
                <button type="button" className="secondary" onClick={() => act(r.id, "reject")}>
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {user.role === "EMPLOYEE" && <p className="hint">Managers cannot approve their own leave.</p>}
    </div>
  );
}
