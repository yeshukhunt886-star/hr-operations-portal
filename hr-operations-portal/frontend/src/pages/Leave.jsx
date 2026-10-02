
import { useEffect, useState } from "react";
import { api } from "../api.js";

export function Leave() {
  const [types, setTypes] = useState([]);
  const [rows, setRows] = useState([]);
  const [balances, setBalances] = useState([]);
  const [holidays, setHolidays] = useState([]);

  const [form, setForm] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    dayType: "FULL_DAY",
    reason: "",
  });

  const [error, setError] = useState("");

  async function load() {
    const [t, l, b, h] = await Promise.all([
      api("/api/leave/types"),
      api("/api/me/leave"),
      api("/api/me/leave/balances"),
      api("/api/holidays"),
    ]);

    const activeTypes = (t.items || []).filter(
      (x) => x.isActive
    );

    setTypes(activeTypes);
    setRows(l.items || []);
    setBalances(b.items || []);
    setHolidays(h.items || []);

    if (!form.leaveTypeId && activeTypes.length > 0) {
      setForm((f) => ({
        ...f,
        leaveTypeId: activeTypes[0].id,
      }));
    }
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  // Convert holiday date to YYYY-MM-DD
  function getHolidayDate(holiday) {
    return String(holiday.date).slice(0, 10);
  }

  // Check whether one date is a company holiday
  function isHoliday(date) {
    if (!date) return false;

    return holidays.some(
      (holiday) =>
        getHolidayDate(holiday) === date
    );
  }

  // Check whether one date is Sunday
  function isSunday(date) {
    if (!date) return false;

    const day = new Date(
      `${date}T00:00:00`
    ).getDay();

    return day === 0;
  }

  // Get Sundays inside a date range
  function getSundaysInRange(
    startDate,
    endDate
  ) {
    if (!startDate || !endDate) {
      return [];
    }

    const start = new Date(
      `${startDate}T00:00:00`
    );

    const end = new Date(
      `${endDate}T00:00:00`
    );

    if (start > end) {
      return [];
    }

    const sundays = [];
    const current = new Date(start);

    while (current <= end) {
      if (current.getDay() === 0) {
        const year =
          current.getFullYear();

        const month = String(
          current.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
          current.getDate()
        ).padStart(2, "0");

        sundays.push(
          `${year}-${month}-${day}`
        );
      }

      current.setDate(
        current.getDate() + 1
      );
    }

    return sundays;
  }

  // Check whether range contains Sunday
  function isSundayInRange(
    startDate,
    endDate
  ) {
    return (
      getSundaysInRange(
        startDate,
        endDate
      ).length > 0
    );
  }

  // Check whether selected date range contains a holiday
  function isHolidayInRange(
    startDate,
    endDate
  ) {
    if (!startDate || !endDate) {
      return false;
    }

    const start = new Date(
      `${startDate}T00:00:00`
    );

    const end = new Date(
      `${endDate}T00:00:00`
    );

    if (start > end) {
      return false;
    }

    const current = new Date(start);

    while (current <= end) {
      const year =
        current.getFullYear();

      const month = String(
        current.getMonth() + 1
      ).padStart(2, "0");

      const day = String(
        current.getDate()
      ).padStart(2, "0");

      const dateString =
        `${year}-${month}-${day}`;

      if (isHoliday(dateString)) {
        return true;
      }

      current.setDate(
        current.getDate() + 1
      );
    }

    return false;
  }

  function handleStartDateChange(e) {
    const value = e.target.value;

    if (isSunday(value)) {
      setError(
        `Leave cannot be selected on ${value} because it is Sunday.`
      );

      setForm((f) => ({
        ...f,
        startDate: "",
        endDate: "",
      }));

      return;
    }

    if (isHoliday(value)) {
      setError(
        `Leave cannot be selected on ${value} because it is a company holiday.`
      );

      setForm((f) => ({
        ...f,
        startDate: "",
        endDate: "",
      }));

      return;
    }

    setError("");

    setForm((f) => ({
      ...f,
      startDate: value,

      // For half-day leave, end date must
      // always be the same as start date.
      endDate:
        f.dayType !== "FULL_DAY"
          ? value
          : f.endDate &&
            f.endDate < value
          ? ""
          : f.endDate,
    }));
  }

  function handleEndDateChange(e) {
    const value = e.target.value;

    // Half-day leave is only one day.
    if (form.dayType !== "FULL_DAY") {
      setForm((f) => ({
        ...f,
        endDate: f.startDate,
      }));

      return;
    }

    if (isSunday(value)) {
      setError(
        `Leave cannot be selected on ${value} because it is Sunday.`
      );

      setForm((f) => ({
        ...f,
        endDate: "",
      }));

      return;
    }

    if (isHoliday(value)) {
      setError(
        `Leave cannot be selected on ${value} because it is a company holiday.`
      );

      setForm((f) => ({
        ...f,
        endDate: "",
      }));

      return;
    }

    if (
      form.startDate &&
      value < form.startDate
    ) {
      setError(
        "End date cannot be before start date."
      );

      setForm((f) => ({
        ...f,
        endDate: "",
      }));

      return;
    }

    setError("");

    setForm((f) => ({
      ...f,
      endDate: value,
    }));
  }

  function handleDayTypeChange(e) {
    const value = e.target.value;

    setError("");

    setForm((f) => ({
      ...f,
      dayType: value,

      // Half-day = one date only.
      endDate:
        value !== "FULL_DAY"
          ? f.startDate
          : f.endDate,
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!form.leaveTypeId) {
      setError(
        "Please select a leave type."
      );
      return;
    }

    if (
      !form.startDate ||
      !form.endDate
    ) {
      setError(
        "Please select both start date and end date."
      );
      return;
    }

    if (form.endDate < form.startDate) {
      setError(
        "End date cannot be before start date."
      );
      return;
    }

    // Half-day must be one date.
    if (
      form.dayType !== "FULL_DAY" &&
      form.startDate !== form.endDate
    ) {
      setError(
        "Half-day leave can only be applied for one day."
      );
      return;
    }

    // Start date Sunday
    if (isSunday(form.startDate)) {
      setError(
        `Leave cannot be applied on ${form.startDate} because it is Sunday.`
      );
      return;
    }

    // End date Sunday
    if (isSunday(form.endDate)) {
      setError(
        `Leave cannot be applied on ${form.endDate} because it is Sunday.`
      );
      return;
    }

    // Sunday anywhere inside range
    if (
      isSundayInRange(
        form.startDate,
        form.endDate
      )
    ) {
      const sundays =
        getSundaysInRange(
          form.startDate,
          form.endDate
        );

      setError(
        `Leave range contains Sunday (${sundays.join(
          ", "
        )}). Please select working days only.`
      );

      return;
    }

    // Start date holiday
    if (isHoliday(form.startDate)) {
      setError(
        `Leave cannot be applied on ${form.startDate} because it is a company holiday.`
      );
      return;
    }

    // End date holiday
    if (isHoliday(form.endDate)) {
      setError(
        `Leave cannot be applied on ${form.endDate} because it is a company holiday.`
      );
      return;
    }

    // Holiday anywhere inside range
    if (
      isHolidayInRange(
        form.startDate,
        form.endDate
      )
    ) {
      setError(
        "Leave cannot be applied because the selected date range contains a company holiday."
      );
      return;
    }

    try {
      await api("/api/me/leave", {
        method: "POST",

        // Existing fields + new dayType.
        body: {
          leaveTypeId: form.leaveTypeId,
          startDate: form.startDate,
          endDate: form.endDate,
          dayType: form.dayType,
          reason: form.reason,
        },
      });

      await load();

      setForm((f) => ({
        ...f,
        startDate: "",
        endDate: "",
        dayType: "FULL_DAY",
        reason: "",
      }));

      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function cancel(id) {
    setError("");

    try {
      await api(
        `/api/me/leave/${id}/cancel`,
        {
          method: "POST",
          body: {},
        }
      );

      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const rangeContainsHoliday =
    isHolidayInRange(
      form.startDate,
      form.endDate
    );

  const rangeContainsSunday =
    isSundayInRange(
      form.startDate,
      form.endDate
    );

  const submitDisabled =
    !form.startDate ||
    !form.endDate ||
    !form.leaveTypeId ||
    rangeContainsHoliday ||
    rangeContainsSunday;

  return (
    <div>
      <header className="page-head">
        <div>
          <p className="eyebrow">
            Time off
          </p>

          <h1>Leave</h1>
        </div>
      </header>

      <div className="split">
        <form
          className="card"
          onSubmit={submit}
        >
          <h2>New request</h2>

          <label>
            Type

            <select
              value={form.leaveTypeId}
              onChange={(e) =>
                setForm({
                  ...form,
                  leaveTypeId:
                    e.target.value,
                })
              }
            >
              <option value="">
                Select leave type
              </option>

              {types.map((t) => (
                <option
                  key={t.id}
                  value={t.id}
                >
                  {t.name}{" "}
                  {t.paid
                    ? "(paid)"
                    : "(unpaid)"}
                </option>
              ))}
            </select>
          </label>

          {/* ADDED: Day Type */}
          <label>
            Day Type

            <select
              value={form.dayType}
              onChange={
                handleDayTypeChange
              }
            >
              <option value="FULL_DAY">
                Full Day
              </option>

              <option value="FIRST_HALF">
                First Half
              </option>

              <option value="SECOND_HALF">
                Second Half
              </option>
            </select>
          </label>

          <label>
            Start

            <input
              type="date"
              value={form.startDate}
              onChange={
                handleStartDateChange
              }
              required
            />
          </label>

          <label>
            End

            <input
              type="date"
              value={form.endDate}
              min={
                form.startDate ||
                undefined
              }
              onChange={
                handleEndDateChange
              }
              disabled={
                form.dayType !==
                "FULL_DAY"
              }
              required
            />
          </label>

          <label>
            Reason

            <textarea
              value={form.reason}
              onChange={(e) =>
                setForm({
                  ...form,
                  reason:
                    e.target.value,
                })
              }
              required
            />
          </label>

          {error && (
            <p className="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitDisabled}
          >
            Submit request
          </button>

          <p className="hint">
            Leave cannot be applied on company
            holidays or Sundays. Weekends and
            holidays are excluded from chargeable
            days.
          </p>

          {holidays.length > 0 && (
            <div className="card">
              <h3>
                Company Holidays
              </h3>

              <ul className="plain">
                {holidays.map(
                  (holiday) => (
                    <li
                      key={holiday.id}
                    >
                      {getHolidayDate(
                        holiday
                      )}

                      {holiday.name
                        ? ` - ${holiday.name}`
                        : ""}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
        </form>

        <div>
          <div className="card">
            <h2>
              Balances (this year)
            </h2>

            <ul className="plain">
              {balances.map((b) => (
                <li key={b.id}>
                  {b.leaveType.name}:{" "}
                  {Number(
                    b.entitled
                  ) -
                    Number(b.used)}{" "}
                  remaining
                </li>
              ))}
            </ul>
          </div>

          <table>
            <thead>
              <tr>
                <th>Dates</th>
                <th>Type</th>
                <th>Days</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {String(
                      r.startDate
                    ).slice(0, 10)}{" "}
                    →{" "}
                    {String(
                      r.endDate
                    ).slice(0, 10)}
                  </td>

                  <td>
                    {r.leaveType?.name}

                    {/* Show half-day type only
                        when backend returns it */}
                    {r.dayType &&
                      r.dayType !==
                        "FULL_DAY" && (
                        <>
                          {" "}
                          (
                          {r.dayType ===
                          "FIRST_HALF"
                            ? "First Half"
                            : "Second Half"}
                          )
                        </>
                      )}
                  </td>

                  <td>
                    {Number(
                      r.daysCharged
                    )}
                  </td>

                  <td>
                    {r.status}
                  </td>

                  <td>
                    {(r.status ===
                      "PENDING" ||
                      r.status ===
                        "APPROVED") && (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() =>
                          cancel(
                            r.id
                          )
                        }
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
