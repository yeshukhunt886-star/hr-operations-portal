import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export function Dashboard() {
  const { user } = useAuth();
  const [clock, setClock] = useState(null);
  const [open, setOpen] = useState(null);
  const [balances, setBalances] = useState([]);

  useEffect(() => {
    api("/api/me/clock").then(setClock).catch(() => {});
    api("/api/me/attendance/open").then((d) => setOpen(d.session)).catch(() => {});
    api("/api/me/leave/balances").then((d) => setBalances(d.items || [])).catch(() => {});
  }, []);

  const name = user.employee ? user.employee.firstName : "there";

  return (
    <div>
      <header className="page-head">
        <div>
          <p className="eyebrow">Today</p>
          <h1>Hello, {name}</h1>
        </div>
        {clock && (
          <div className="clock">
            <span>{clock.businessDate}</span>
            <small>{clock.timezone}</small>
          </div>
        )}
      </header>
      <section className="grid-3">
        <article className="card">
          <h2>Attendance</h2>
          <p>{open ? "You have an open check-in." : "No open session."}</p>
          <Link to="/attendance" className="text-link">
            Go to attendance
          </Link>
        </article>
        <article className="card">
          <h2>Leave balances</h2>
          <ul className="plain">
            {balances.length === 0 && <li>No paid balances for this year.</li>}
            {balances.map((b) => (
              <li key={b.id}>
                {b.leaveType.name}: {Number(b.entitled) - Number(b.used)} of {Number(b.entitled)} remaining
              </li>
            ))}
          </ul>
        </article>
        <article className="card">
          <h2>Policy snapshot</h2>
          <p>Work start 09:00 IST, 15-minute grace, one open session, weekends and holidays are not charged as leave.</p>
        </article>
      </section>
    </div>
  );
}
