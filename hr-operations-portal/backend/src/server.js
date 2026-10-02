
import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./prisma.js";
import { autoCheckOut } from "./services/attendanceService.js";

const app = createApp();

let autoCheckOutRunning = false;

async function runAutoCheckOut() {
  if (autoCheckOutRunning) {
    return;
  }

  autoCheckOutRunning = true;

  try {
    const openLocks = await prisma.attendanceOpenLock.findMany({
      select: {
        employeeId: true,
      },
    });

    for (const lock of openLocks) {
      try {
        const closedSession = await autoCheckOut(lock.employeeId);

        if (closedSession) {
          console.log(
            `[AUTO CHECK-OUT] Employee ${lock.employeeId} session ${closedSession.id} closed automatically.`
          );
        }
      } catch (error) {
        console.error(
          `[AUTO CHECK-OUT ERROR] Employee ${lock.employeeId}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("[AUTO CHECK-OUT SCHEDULER ERROR]", error);
  } finally {
    autoCheckOutRunning = false;
  }
}

app.listen(config.port, () => {
  console.log(
    `HR Ops API listening on http://localhost:${config.port} tz=${config.businessTz}`
  );

  // Run once when the server starts
  runAutoCheckOut();

  // Check every 60 seconds
  setInterval(runAutoCheckOut, 60 * 1000);

  console.log(
    "[AUTO CHECK-OUT] Scheduler started. Checking every 60 seconds."
  );
});