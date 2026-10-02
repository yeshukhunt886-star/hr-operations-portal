import { useEffect, useState } from "react";
import { api } from "../api.js";

export function Payslips() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/me/payslips")
      .then((d) => setItems(d.items || []))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <header className="page-head">
        <div>
          <p className="eyebrow">Compensation</p>
          <h1>My payslips</h1>
        </div>
      </header>
      {error && <p className="alert">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Period</th>
            <th>Payable days</th>
            <th>Gross</th>
            <th>Net</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={4}>No finalized payslips yet.</td>
            </tr>
          )}
          {items.map((i) => (
            <tr key={i.id}>
              <td>
                {i.year}-{String(i.month).padStart(2, "0")}
              </td>
              <td>{Number(i.payableDays)}</td>
              <td>{Number(i.grossPay).toFixed(2)}</td>
              <td>{Number(i.netPay).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
