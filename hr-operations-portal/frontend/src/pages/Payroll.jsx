import { useEffect, useState } from "react";
import { api } from "../api.js";

export function Payroll() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [runs, setRuns] = useState([]);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState("");
  const [reopen, setReopen] = useState(false);

  async function load() {
    const data = await api("/api/payroll/runs");
    setRuns(data.items || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function generate() {
    setError("");
    try {
      const run = await api("/api/payroll/generate", {
        method: "POST",
        body: { year: Number(year), month: Number(month), reopen }
      });
      setCurrent(run);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function openRun(id) {
    const run = await api(`/api/payroll/runs/${id}`);
    setCurrent(run);
  }

  return (
    <div>
      <header className="page-head">
        <div>
          <p className="eyebrow">Compensation</p>
          <h1>Payroll</h1>
        </div>
      </header>
      <div className="card row">
        <label>
          Year
          <input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        </label>
        <label>
          Month
          <input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={reopen} onChange={(e) => setReopen(e.target.checked)} />
          Reopen finalized month
        </label>
        <button type="button" onClick={generate}>
          Generate & finalize
        </button>
      </div>
      {error && <p className="alert">{error}</p>}
      <p className="hint">
        Daily rate = base salary / working days in month. Payable days clip join/exit and subtract unpaid leave. HALF_UP to 2
        decimals. Finalized items are immutable unless you reopen.
      </p>
      <div className="split">
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.year}-{String(r.month).padStart(2, "0")}
                </td>
                <td>{r.status}</td>
                <td>
                  <button type="button" className="ghost" onClick={() => openRun(r.id)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {current && (
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Payable days</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {(current.items || []).map((i) => (
                <tr key={i.id}>
                  <td>
                    {i.employee?.firstName} {i.employee?.lastName}
                  </td>
                  <td>{Number(i.payableDays)}</td>
                  <td>{Number(i.netPay).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
