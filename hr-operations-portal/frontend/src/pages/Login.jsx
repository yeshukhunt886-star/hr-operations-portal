
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export function Login() {
  const { user, login } = useAuth();
  // Start with a seeded demo employee account.
  const [email, setEmail] = useState("employee@gmail.com");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-panel">
        <p className="eyebrow">Northline · internal</p>
        <h1>Sign in to operations</h1>
        <p className="lede"> Attendance, leave, and payroll for a single business timezone (Asia/Kolkata). </p>
        <form onSubmit={onSubmit}>
          <label>
            Work email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && <p className="alert">{error}</p>}

          <button type="submit" disabled={busy}>
            {busy ? "Checking…" : "Continue"}
          </button>
        </form>

        <div className="demo">
          <p>Demo accounts · password <code>Password123!</code></p>
          <button
            type="button"
            className="chip"
            onClick={() => setEmail("employee@gmail.com")}> Employee
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => setEmail("manager@gmail.com")}> Manager
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => setEmail("hr@gmail.com")}> HR
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => setEmail("admin@gmail.com")}> Admin
          </button>
        </div>
      </div>
    </div>
  );
}