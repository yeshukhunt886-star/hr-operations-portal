import { logger } from "../logger.js";
import { prisma } from "../prisma.js";
import { config } from "../config.js";
import { runImportJob } from "./importRunner.js";

const inFlight = new Set();
let timer = null;

export async function recoverStaleJobs() {
  const cutoff = new Date(Date.now() - config.jobStallMs);
  const stalled = await prisma.importJob.updateMany({
    where: { status: "running", updatedAt: { lt: cutoff } },
    data: { status: "stalled" },
  });
  if (stalled.count) {
    logger.warn({ count: stalled.count }, "Marked stalled import jobs for retry");
  }
}

export async function enqueueWorker(jobId) {
  if (inFlight.has(jobId)) return;
  inFlight.add(jobId);
  try {
    await runImportJob(jobId);
  } catch (err) {
    logger.error({ jobId, err: err.message }, "Worker crashed");
    await prisma.importJob.updateMany({
      where: { id: jobId, status: "running" },
      data: { status: "stalled", errorSummary: "Worker crashed; job marked stalled for retry" },
    });
  } finally {
    inFlight.delete(jobId);
  }
}

async function tick() {
  const next = await prisma.importJob.findFirst({
    where: { status: { in: ["queued", "stalled"] } },
    orderBy: { createdAt: "asc" },
  });
  if (next && inFlight.size < 1) {
    enqueueWorker(next.id);
  }
}

export function startJobQueue() {
  recoverStaleJobs().catch((err) => logger.error({ err: err.message }, "Stall recovery failed"));
  timer = setInterval(() => {
    recoverStaleJobs().catch(() => {});
    tick().catch((err) => logger.error({ err: err.message }, "Queue tick failed"));
  }, 1500);
  tick().catch(() => {});
}

export function stopJobQueue() {
  if (timer) clearInterval(timer);
}
