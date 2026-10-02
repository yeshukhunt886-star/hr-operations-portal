import { DateTime } from "luxon";
import { config } from "../config.js";

export function nowTz() {
  return DateTime.now().setZone(config.businessTz);
}

export function toTz(jsDate) {
  return DateTime.fromJSDate(jsDate, { zone: "utc" }).setZone(config.businessTz);
}

export function parseIsoInBusinessTz(value) {
  if (!value) return nowTz();
  const dt = DateTime.fromISO(value, { setZone: true });
  if (!dt.isValid) {
    throw Object.assign(new Error("Invalid timestamp"), { status: 400, code: "INVALID_TIME" });
  }
  return dt.setZone(config.businessTz);
}

export function jsDateToCalendar(jsDate) {
  return DateTime.fromJSDate(jsDate, { zone: "utc" }).toISODate();
}

/** Persist DATE columns as UTC midnight of the civil YYYY-MM-DD. */
export function toDateColumn(dtOrIso) {
  const s = DateTime.isDateTime(dtOrIso)
    ? dtOrIso.toISODate()
    : dtOrIso instanceof Date
      ? jsDateToCalendar(dtOrIso)
      : String(dtOrIso).slice(0, 10);
  return new Date(`${s}T00:00:00.000Z`);
}

export function businessDate(dt) {
  return toDateColumn(dt.setZone(config.businessTz).startOf("day"));
}

export function dateOnly(isoDate) {
  const s = isoDate instanceof Date ? jsDateToCalendar(isoDate) : String(isoDate).slice(0, 10);
  const dt = DateTime.fromISO(s, { zone: config.businessTz });
  if (!dt.isValid) {
    throw Object.assign(new Error("Invalid date"), { status: 400, code: "INVALID_DATE" });
  }
  return dt.startOf("day");
}

export function parseWorkStart(hhmm, onDate) {
  const [h, m] = String(hhmm || config.workStart).split(":").map(Number);
  return onDate.set({ hour: h, minute: m, second: 0, millisecond: 0 });
}

export function endOfBusinessDay(onDate) {
  return onDate.set({ hour: 23, minute: 59, second: 59, millisecond: 0 });
}

export function isWeekend(dt) {
  return dt.weekday === 6 || dt.weekday === 7;
}

export function eachDay(start, end) {
  const days = [];
  let cursor = start.startOf("day");
  const last = end.startOf("day");
  while (cursor <= last) {
    days.push(cursor);
    cursor = cursor.plus({ days: 1 });
  }
  return days;
}

export function monthRange(year, month) {
  const start = DateTime.fromObject({ year, month, day: 1 }, { zone: config.businessTz }).startOf("day");
  const end = start.endOf("month").startOf("day");
  return { start, end };
}

export function clampInterval(start, end, min, max) {
  const s = start < min ? min : start;
  const e = end > max ? max : end;
  if (e < s) return null;
  return { start: s, end: e };
}
