import { Decimal } from "@prisma/client/runtime/library";

/** HALF_UP to `places` decimal places. Deterministic for payroll. */
export function roundMoney(value, places = 2) {
  const d = value instanceof Decimal ? value : new Decimal(String(value));
  return d.toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
}

export function toDecimal(value) {
  return value instanceof Decimal ? value : new Decimal(String(value));
}

export function assertNonNegativeMoney(value, field) {
  const d = toDecimal(value);
  if (d.isNegative()) {
    throw Object.assign(new Error(`${field} cannot be negative`), { status: 400, code: "INVALID_AMOUNT" });
  }
  if (d.decimalPlaces() > 2) {
    throw Object.assign(new Error(`${field} allows at most 2 decimal places`), { status: 400, code: "INVALID_PRECISION" });
  }
  return roundMoney(d, 2);
}
