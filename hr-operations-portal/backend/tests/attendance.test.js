import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DateTime } from "luxon";
import { parseWorkStart, endOfBusinessDay } from "../src/lib/time.js";

describe("attendance day boundary", () => {
  it("caps a session at end of the check-in business day", () => {
    const checkIn = DateTime.fromISO("2026-09-01T22:00:00", { zone: "Asia/Kolkata" });
    const nextDayCheckout = DateTime.fromISO("2026-09-02T09:00:00", { zone: "Asia/Kolkata" });
    const closed = endOfBusinessDay(checkIn.startOf("day"));
    assert.equal(closed.toISODate(), "2026-09-01");
    assert.equal(closed.hour, 23);
    assert.ok(closed < nextDayCheckout);
    const mins = Math.round(closed.diff(checkIn, "minutes").minutes);
    assert.equal(mins, 120);
    assert.ok(mins < 24 * 60);
  });

  it("computes late minutes after grace", () => {
    const day = DateTime.fromISO("2026-09-01", { zone: "Asia/Kolkata" });
    const expected = parseWorkStart("09:00", day);
    const punch = day.set({ hour: 9, minute: 40 });
    const grace = expected.plus({ minutes: 15 });
    const late = punch > grace ? Math.round(punch.diff(expected, "minutes").minutes) : 0;
    assert.equal(late, 40);
  });
});
