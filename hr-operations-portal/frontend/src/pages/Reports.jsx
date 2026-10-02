import { useState } from "react";
import { api } from "../api.js";

export function Reports() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [attendance, setAttendance] = useState(null);
  const [payroll, setPayroll] = useState(null);
  const [depts, setDepts] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const q = `year=${year}&month=${month}`;
      const [a, p, d] = await Promise.allSettled([
        api(`/api/reports/attendance?${q}`),
        api(`/api/reports/payroll?${q}`),
        api(`/api/reports/departments?${q}`)
      ]);
      if (a.status === "fulfilled") setAttendance(a.value);
      if (p.status === "fulfilled") setPayroll(p.value);
      else setPayroll({ items: [] });
      if (d.status === "fulfilled") setDepts(d.value);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <header className="page-head">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Reports</h1>
        </div>
        <div className="actions">
          <input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          <input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button type="button" onClick={load}>
            Run
          </button>
        </div>
      </header>
      {error && <p className="alert">{error}</p>}
      {attendance && (
        <>
          <h2>Attendance</h2>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Dept</th>
                <th>Sessions</th>
                <th>Minutes</th>
                <th>Late</th>
              </tr>
            </thead>
            <tbody>
              {attendance.items.length === 0 && (
                <tr>
                  <td colSpan={5}>Zero employees or no attendance in this month.</td>
                </tr>
              )}
              {attendance.items.map((r) => (
                <tr key={r.employeeId}>
                  <td>
                    {r.name} ({r.employeeCode})
                  </td>
                  <td>{r.department}</td>
                  <td>{r.sessionCount}</td>
                  <td>{r.workedMinutes}</td>
                  <td>{r.lateMinutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {payroll && (
        <>
          <h2>Payroll</h2>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Payable days</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {payroll.items.length === 0 && (
                <tr>
                  <td colSpan={3}>No finalized payroll for this month.</td>
                </tr>
              )}
              {payroll.items.map((r) => (
                <tr key={r.employeeId}>
                  <td>{r.name}</td>
                  <td>{Number(r.payableDays)}</td>
                  <td>{Number(r.netPay).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {depts && (
        <>
          <h2>Departments</h2>
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Headcount</th>
                <th>Attendance sessions</th>
                <th>Payroll net</th>
              </tr>
            </thead>
            <tbody>
              {depts.items.map((r) => (
                <tr key={r.departmentId}>
                  <td>{r.name}</td>
                  <td>{r.employeeCount}</td>
                  <td>{r.attendanceSessions}</td>
                  <td>{Number(r.payrollNet).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
