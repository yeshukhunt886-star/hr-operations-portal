import { useEffect, useState } from "react";
import { api } from "../api.js";

export function Audit() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/audit")
      .then((d) => setItems(d.items || []))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <header className="page-head">
        <div>
          <p className="eyebrow">Traceability</p>
          <h1>Audit log</h1>
        </div>
      </header>
      {error && <p className="alert">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Entity</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id}>
              <td>{new Date(a.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
              <td>{a.actor?.email || "system"}</td>
              <td>{a.action}</td>
              <td>
                {a.entityType} · {a.entityId}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
