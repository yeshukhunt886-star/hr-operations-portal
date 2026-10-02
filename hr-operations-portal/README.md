# Northline HR — Employee Operations, Attendance, Leave & Payroll

Full-stack HR operations portal for a small company. Employees check in/out, request leave, and view their own records. Managers and HR handle approvals, people data, reports, and simplified but deterministic payroll.

## Stack

- **Backend:** Node.js, Express, Prisma, PostgreSQL, JWT, argon2, Luxon, Zod
- **Frontend:** React 18, Vite, React Router
- **Business timezone:** `Asia/Kolkata` (override with `BUSINESS_TZ`)

## Quick start

PostgreSQL 16 is expected on `localhost:5432` (user `hr` / password `hr` / database `hr_ops`). Docker Compose is included.

```bash
docker compose up -d
cd backend
copy .env.example .env   # Windows
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Demo logins (password `Password123!`)

| Email | Role |
| --- | --- |
| `admin@acme.test` | ADMIN |
| `hr@acme.test` | HR |
| `manager@acme.test` | MANAGER (Engineering) |
| `employee@acme.test` | EMPLOYEE (Rohit, reports to Leela) |
| `employee2@acme.test` | EMPLOYEE (Maya, reports to Leela) |

## Business rules

### Timezone and attendance

- All day boundaries, late minutes, holidays, and leave chargeable days use **`BUSINESS_TZ` (default Asia/Kolkata)**. Instants are stored in UTC.
- Expected start is `WORK_START` (default `09:00`) with `LATE_GRACE_MINUTES` (default 15). Late minutes are from expected start, not from the end of grace.
- **One open session per employee**, enforced with an `AttendanceOpenLock` row and `SELECT … FOR UPDATE`.
- Checkout without an open session is rejected. A repeated checkout with the same `Idempotency-Key` header returns the original closed session.
- Checkout earlier than check-in is rejected.
- **Midnight policy:** a session cannot span a business date. If checkout falls on a later calendar day in the business timezone, the session is closed at `23:59:59` of the check-in day. Duration is capped at `MAX_SHIFT_HOURS` (default 16). This avoids negative or 24+ hour accidents.
- Check-in on a day covered by **approved leave with chargeable days &gt; 0** is rejected.
- Client-supplied `employeeId` on self-service punch/leave APIs is **ignored**. Identity comes from the JWT.

### Leave

Chargeable days = weekdays in `[start, end]` minus company-wide holidays and that employee’s department holidays. Weekends are not charged.

**Transitions (explicit):**

| From | Employee | Manager (team only, not self) | HR/Admin |
| --- | --- | --- | --- |
| PENDING | CANCELLED | APPROVED, REJECTED | APPROVED, REJECTED, CANCELLED |
| APPROVED | CANCELLED only if start date is still in the future | — | CANCELLED (blocked if that month’s payroll is finalized) |
| REJECTED / CANCELLED | — | — | PENDING (reopen) |

- Overlap of PENDING or APPROVED requests for the same employee is rejected.
- Paid leave that exceeds remaining balance is rejected (exact remaining, including zero after the request, is allowed).
- Concurrent approve/reject uses `version` optimistic locking; only one transition wins and balance is adjusted once.
- Inactive leave types remain on historical requests; new requests cannot use them.
- Managers **cannot approve their own leave**.

### Payroll formula

For calendar month `(year, month)`:

1. `workingDaysInMonth` = weekdays in the month minus holidays for the employee’s **current** department (historical attendance/payroll rows are not rewritten when department changes).
2. Service window = `[monthStart, monthEnd]` clipped to `[joinDate, exitDate]` (exit day is included). Employees who join after month-end or exit before month-start are skipped.
3. `payableWorkingDays` = working days in the service window.
4. `unpaidLeaveDays` / `paidLeaveDays` = chargeable days of APPROVED leave of that type overlapping the service window.
5. `payableDays` = `payableWorkingDays - unpaidLeaveDays`.
6. `dailyRate` = `baseSalary / workingDaysInMonth`, **HALF_UP to 4 decimal places**.
7. `grossPay` = `dailyRate * payableDays`, **HALF_UP to 2 decimal places**.
8. `netPay` = `grossPay + bonus - deduction`, **HALF_UP to 2 decimal places**.
9. Bonus and deduction must be **≥ 0** and at most **2 decimal places**.

Mid-month join/exit is handled by step 2. Generating payroll twice for the same employee/month is blocked by `FinalizedPayrollKey`. Reopen supersedes previous items, then generates a new finalized run. If generation throws after the processing run is created, the run is marked **FAILED**; item inserts live in a transaction and roll back so data is not half-written.

Attendance or leave edits **do not** change a finalized payslip. Reopen payroll explicitly, then regenerate.

Salary is visible to **HR/Admin** and to the **employee concerned**. Other employees receive `403 Forbidden` without leaking whether a record exists.

### Sessions and inactive staff

Inactive/terminated employees cannot log in. Existing JWTs fail on the next request (`ACCOUNT_INACTIVE` or `SESSION_REVOKED`). Terminating an employee increments `tokenVersion` and sets `user.isActive = false`.

### Org units

Departments and designations with **active employees cannot be deleted**; they are soft-deactivated after staff are reassigned. Historical attendance and payroll keep their original rows.

### Pagination

`page` (min 1) and `pageSize` (default 20, **max 100**).

## API sketch

- `POST /api/auth/login`
- `GET/POST /api/me/attendance…`, `/api/me/leave…`, `/api/me/payslips`
- `GET/POST /api/employees`, `/api/org/departments`
- `POST /api/leave/requests/:id/approve|reject|reopen|cancel`
- `POST /api/payroll/generate`
- `GET /api/reports/attendance|payroll|departments`
- `GET /api/audit`

## Tests

```bash
cd backend
npm test
```

## Attendance break rules

- Standard work target: 6 hours (360 minutes) of actual working time.
- Standard break allowance: 45 minutes.
- Attendance supports `Break In` and `Break Out`.
- `workedMinutes` is calculated as elapsed session duration minus the recorded break duration.
- Reports use `workedMinutes` when available.
- A break longer than 45 minutes is recorded as actual time and can therefore be identified for policy handling.
