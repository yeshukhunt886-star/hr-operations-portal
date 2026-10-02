import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export function Employees() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [depts, setDepts] = useState([]);
  const [desigs, setDesigs] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    employeeCode: "",
    firstName: "",
    lastName: "",
    email: "",
    departmentId: "",
    designationId: "",
    joinDate: "2026-09-01",
    baseSalary: 80000,
    role: "EMPLOYEE"
  });
  const privileged = user.role === "HR" || user.role === "ADMIN";

  async function load() {
    const [e, d, g] = await Promise.all([api("/api/employees"), api("/api/org/departments"), api("/api/org/designations")]);
    setRows(e.items || []);
    setDepts(d.items || []);
    setDesigs(g.items || []);
    setForm((f) => ({
      ...f,
      departmentId: f.departmentId || d.items?.[0]?.id || "",
      designationId: f.designationId || g.items?.[0]?.id || ""
    }));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function create(ev) {
    ev.preventDefault();
    setError("");
    try {
      await api("/api/employees", {
        method: "POST",
        body: { ...form, baseSalary: Number(form.baseSalary), password: "Password123!" }
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <header className="page-head">
        <div>
          <p className="eyebrow">Master data</p>
          <h1>People</h1>
        </div>
      </header>
      {error && <p className="alert">{error}</p>}
      {privileged && (
        <form className="card form-grid" onSubmit={create}>
          <h2>Add employee</h2>
          <input placeholder="Code" value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} required />
          <input placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          <input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
            {depts.filter((d) => d.isActive).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select value={form.designationId} onChange={(e) => setForm({ ...form, designationId: e.target.value })}>
            {desigs.filter((d) => d.isActive).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
          <input type="number" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
          <button type="submit">Create</button>
        </form>
      )}
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Department</th>
            <th>Status</th>
            <th>Join</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.employeeCode}</td>
              <td>
                {r.firstName} {r.lastName}
              </td>
              <td>{r.department?.name}</td>
              <td>{r.status}</td>
              <td>{String(r.joinDate).slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
