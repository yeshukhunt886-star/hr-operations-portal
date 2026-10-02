import { useEffect, useState } from "react";
import { api } from "../api.js";

export function Holidays() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("2026-11-01");
  const [error, setError] = useState("");

  async function load() {
    const data = await api("/api/holidays?year=2026");
    setItems(data.items || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function add(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/holidays", { method: "POST", body: { name, date } });
      setName("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <header className="page-head">
        <div>
          <p className="eyebrow">Calendar</p>
          <h1>Holidays</h1>
        </div>
      </header>
      <form className="card row" onSubmit={add}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button type="submit">Add company holiday</button>
      </form>
      {error && <p className="alert">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Scope</th>
          </tr>
        </thead>
        <tbody>
          {items.map((h) => (
            <tr key={h.id}>
              <td>{String(h.date).slice(0, 10)}</td>
              <td>{h.name}</td>
              <td>{h.department?.name || "Company-wide"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
