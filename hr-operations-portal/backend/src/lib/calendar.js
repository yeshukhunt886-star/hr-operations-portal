import { prisma } from "../prisma.js";
import { eachDay, isWeekend, toDateColumn } from "./time.js";

export async function holidaySet(start, end, departmentId) {
  const holidays = await prisma.holiday.findMany({
    where: {
      date: { gte: toDateColumn(start), lte: toDateColumn(end) },
      OR: [{ departmentId: null }, ...(departmentId ? [{ departmentId }] : [])]
    }
  });
  return new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));
}

export async function chargeableDays(start, end, departmentId) {
  const holidays = await holidaySet(start, end, departmentId);
  let count = 0;
  for (const day of eachDay(start, end)) {
    const key = day.toISODate();
    if (isWeekend(day) || holidays.has(key)) continue;
    count += 1;
  }
  return count;
}

export async function workingDaysInRange(start, end, departmentId) {
  return chargeableDays(start, end, departmentId);
}

export async function isHolidayOrWeekend(day, departmentId) {
  if (isWeekend(day)) return true;
  const holidays = await holidaySet(day, day, departmentId);
  return holidays.has(day.toISODate());
}
