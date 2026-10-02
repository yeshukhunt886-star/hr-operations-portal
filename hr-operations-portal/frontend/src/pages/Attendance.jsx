
import { useEffect, useState } from "react";
import { api } from "../api.js";

const WORK_MINUTES = 6 * 60;
const BREAK_MINUTES = 45;

function fmt(dt) {
  if (!dt) return "—";

  return new Date(dt).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
}

function mins(value) {
  if (value == null) return "—";

  const total = Math.max(0, Math.floor(Number(value)));
  const h = Math.floor(total / 60);
  const m = total % 60;

  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function calculateCurrentWorkedMinutes(session) {
  if (!session?.checkInAt) {
    return 0;
  }

  const now = Date.now();
  const checkIn = new Date(session.checkInAt).getTime();

  let elapsedMinutes = Math.floor(
    (now - checkIn) / 60000
  );

  if (elapsedMinutes < 0) {
    elapsedMinutes = 0;
  }

  let breakMinutes = 0;

  if (session.breakInAt && session.breakOutAt) {
    breakMinutes =
      Number(session.breakDurationMinutes) || 0;
  }

  return Math.max(
    0,
    elapsedMinutes - breakMinutes
  );
}

export function Attendance() {
  const [open, setOpen] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [o, list] = await Promise.all([
      api("/api/me/attendance/open"),
      api("/api/me/attendance"),
    ]);

    setOpen(o.session);
    setRows(list.items || []);
  }

  useEffect(() => {
    load().catch((e) => {
      setError(e.message);
    });
  }, []);

  async function punch(kind) {
    setError("");
    setMessage("");

    /*
      Employee can checkout only after
      completing 6 hours of actual working time.
    */
    if (kind === "out" && open) {
      const workedMinutes =
        calculateCurrentWorkedMinutes(open);

      const remainingMinutes =
        WORK_MINUTES - workedMinutes;

      if (remainingMinutes > 0) {
        setMessage(
          `Checkout not available yet. You have ${mins(
            remainingMinutes
          )} remaining to complete 6 working hours.`
        );

        return;
      }
    }

    try {
      const key =
        kind === "out"
          ? `out-${Date.now()}`
          : undefined;

      await api(
        `/api/me/attendance/check-${
          kind === "in" ? "in" : "out"
        }`,
        {
          method: "POST",
          body: {},
          headers: key
            ? {
                "Idempotency-Key": key,
              }
            : undefined,
        }
      );

      setMessage(
        kind === "in"
          ? "Checked in."
          : "Checked out successfully."
      );

      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function breakPunch(kind) {
    setError("");
    setMessage("");

    try {
      await api(
        `/api/me/attendance/break-${kind}`,
        {
          method: "POST",
          body: {},
        }
      );

      setMessage(
        kind === "in"
          ? "Break started."
          : "Break ended."
      );

      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  const breakOpen =
    !!open?.breakInAt &&
    !open?.breakOutAt;

  const breakDone =
    !!open?.breakOutAt;

  const liveWorked =
    open
      ? calculateCurrentWorkedMinutes(open)
      : 0;

  return (
    <div>
      <header className="page-head">
        <div>
          <p className="eyebrow">Time</p>

          <h1>Attendance</h1>

          <p className="hint">
            Company work target: 6 hours ·
            Break allowance: 45 minutes
          </p>
        </div>

        <div className="actions">
          <button
            type="button"
            disabled={!!open}
            onClick={() => punch("in")}
          >
            Check in
          </button>

          <button
            type="button"
            className="secondary"
            disabled={!open || breakOpen}
            onClick={() => punch("out")}
          >
            Check out
          </button>
        </div>
      </header>

      {error && (
        <p className="alert">
          {error}
        </p>
      )}

      {message && (
        <p className="ok">
          {message}
        </p>
      )}

      {open && (
        <div
          className="card"
          style={{ marginBottom: "1rem" }}
        >
          <div className="row">
            <div>
              <strong>Checked in</strong>

              <div className="hint">
                {fmt(open.checkInAt)}
              </div>
            </div>

            <div>
              <strong>Break</strong>

              <div className="hint">
                {open.breakInAt
                  ? open.breakOutAt
                    ? `${mins(
                        open.breakDurationMinutes
                      )} used`
                    : "Break running"
                  : "Not started"}
              </div>
            </div>

            <div>
              <strong>Worked</strong>

              <div className="hint">
                {open.workedMinutes != null
                  ? mins(open.workedMinutes)
                  : mins(liveWorked)}
              </div>
            </div>

            <div className="actions">
              <button
                type="button"
                disabled={
                  !open ||
                  breakOpen ||
                  breakDone
                }
                onClick={() =>
                  breakPunch("in")
                }
              >
                Break In
              </button>

              <button
                type="button"
                className="secondary"
                disabled={!breakOpen}
                onClick={() =>
                  breakPunch("out")
                }
              >
                Break Out
              </button>
            </div>
          </div>

          <p
            className="banner"
            style={{ marginBottom: 0 }}
          >
            Target: {mins(WORK_MINUTES)} working time ·
            Standard break: {BREAK_MINUTES} minutes
            {open.lateMinutes > 0
              ? ` · Late ${open.lateMinutes} min`
              : ""}
          </p>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Business date</th>
            <th>In</th>
            <th>Break In</th>
            <th>Break Out</th>
            <th>Out</th>
            <th>Break</th>
            <th>Worked</th>
            <th>Late</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={9}>
                No attendance yet this view.
              </td>
            </tr>
          )}

          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                {String(
                  r.businessDate
                ).slice(0, 10)}
              </td>

              <td>{fmt(r.checkInAt)}</td>

              <td>{fmt(r.breakInAt)}</td>

              <td>{fmt(r.breakOutAt)}</td>

              <td>{fmt(r.checkOutAt)}</td>

              <td>
                {mins(
                  r.breakDurationMinutes
                )}
              </td>

              <td>
                {mins(
                  r.workedMinutes ??
                    r.durationMinutes
                )}
              </td>

              <td>
                {r.lateMinutes} min
              </td>

              <td>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}