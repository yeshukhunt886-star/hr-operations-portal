import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DateTime } from "luxon";
import { computePayable } from "../src/services/payrollService.js";
import { roundMoney } from "../src/lib/money.js";
import { eachDay, isWeekend } from "../src/lib/time.js";

describe("payroll formula", () => {
  it("prorates mid-month join using working days", () => {
    const result = computePayable({
      baseSalary: 90000,
      workingDaysInMonth: 22,
      payableWorkingDays: 11,
      unpaidLeaveDays: 0,
      bonus: 0,
      deduction: 0
    });
    assert.equal(String(result.dailyRate), "4090.9091");
    assert.equal(String(result.payableDays), "11");
    assert.equal(String(result.netPay), "45000.00");
  });

  it("subtracts unpaid leave and applies bonus/deduction with HALF_UP", () => {
    const result = computePayable({
      baseSalary: 100000,
      workingDaysInMonth: 20,
      payableWorkingDays: 20,
      unpaidLeaveDays: 2,
      bonus: 1500.55,
      deduction: 200.1
    });
    assert.equal(String(result.payableDays), "18");
    assert.equal(String(result.grossPay), "90000.00");
    assert.equal(String(result.netPay), "91300.45");
  });

  it("rejects negative bonus", () => {
    assert.throws(() =>
      computePayable({
        baseSalary: 1,
        workingDaysInMonth: 20,
        payableWorkingDays: 20,
        unpaidLeaveDays: 0,
        bonus: -1,
        deduction: 0
      })
    );
  });
});

describe("money rounding", () => {
  it("uses HALF_UP", () => {
    assert.equal(String(roundMoney("1.225")), "1.23");
    assert.equal(String(roundMoney("1.224")), "1.22");
  });
});

describe("calendar helpers", () => {
  it("enumerates inclusive days and flags weekends", () => {
    const start = DateTime.fromISO("2026-09-04", { zone: "Asia/Kolkata" });
    const end = DateTime.fromISO("2026-09-07", { zone: "Asia/Kolkata" });
    const days = eachDay(start, end);
    assert.equal(days.length, 4);
    assert.equal(isWeekend(DateTime.fromISO("2026-09-05", { zone: "Asia/Kolkata" })), true);
    assert.equal(isWeekend(DateTime.fromISO("2026-09-06", { zone: "Asia/Kolkata" })), true);
  });
});
