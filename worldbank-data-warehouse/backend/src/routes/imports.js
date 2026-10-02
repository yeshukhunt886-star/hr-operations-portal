import { Router } from "express";
import { prisma } from "../prisma.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { parseImportInput, configHash } from "../services/validation.js";
import { enqueueWorker } from "../services/jobQueue.js";
import { fetchCountries, fetchIndicatorMeta, WorldBankError } from "../services/worldbank.js";

export const importRouter = Router();

const DEFAULT_INDICATORS = [
  { code: "SP.POP.TOTL", name: "Population, total" },
  { code: "NY.GDP.MKTP.CD", name: "GDP (current US$)" },
  { code: "NY.GDP.PCAP.CD", name: "GDP per capita (current US$)" },
  { code: "SP.DYN.LE00.IN", name: "Life expectancy at birth, total (years)" },
  { code: "FP.CPI.TOTL.ZG", name: "Inflation, consumer prices (annual %)" },
];

importRouter.get(
  "/defaults",
  asyncHandler(async (_req, res) => {
    res.json({ indicators: DEFAULT_INDICATORS });
  })
);

importRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const take = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const jobs = await prisma.importJob.findMany({
      orderBy: { createdAt: "desc" },
      take,
      include: { _count: { select: { errors: true } } },
    });
    res.json({ jobs: jobs.map(serializeJob) });
  })
);

importRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const job = await prisma.importJob.findUnique({
      where: { id: req.params.id },
      include: { errors: { orderBy: { createdAt: "desc" }, take: 100 } },
    });
    if (!job) throw new HttpError(404, "Import job not found");
    res.json({ job: serializeJob(job) });
  })
);

importRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = parseImportInput(req.body);
    const hash = configHash(input);

    const active = await prisma.importJob.findFirst({
      where: { configHash: hash, status: { in: ["queued", "running", "stalled"] } },
    });
    if (active) {
      throw new HttpError(409, "An identical import is already queued or running", { jobId: active.id });
    }

    try {
      for (const code of input.indicatorCodes) {
        await fetchIndicatorMeta(code);
      }
      if (!input.allCountries) {
        const catalog = await fetchCountries();
        const known = new Set(catalog.map((c) => c.iso2Code));
        const unknown = input.countryCodes.filter((c) => !known.has(c));
        if (unknown.length) {
          throw new HttpError(400, `Unknown country code(s): ${unknown.join(", ")}`);
        }
      }
    } catch (err) {
      if (err instanceof HttpError) throw err;
      if (err instanceof WorldBankError && (err.httpStatus === 404 || err.apiMessage)) {
        throw new HttpError(400, err.message);
      }
      if (err instanceof WorldBankError) {
        throw new HttpError(502, "Could not validate codes against the World Bank API", { reason: err.message });
      }
      throw err;
    }

    const job = await prisma.importJob.create({
      data: {
        status: "queued",
        configHash: hash,
        countryCodesJson: JSON.stringify(input.allCountries ? [] : input.countryCodes),
        indicatorCodesJson: JSON.stringify(input.indicatorCodes),
        yearStart: input.yearStart,
        yearEnd: input.yearEnd,
      },
    });
    enqueueWorker(job.id);
    res.status(202).json({ job: serializeJob(job) });
  })
);

importRouter.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const job = await prisma.importJob.findUnique({ where: { id: req.params.id } });
    if (!job) throw new HttpError(404, "Import job not found");
    if (["success", "partial", "failed", "cancelled"].includes(job.status)) {
      return res.json({ job: serializeJob(job), message: "Job already finished" });
    }
    const updated = await prisma.importJob.update({
      where: { id: job.id },
      data: { cancelRequested: true },
    });
    if (updated.status === "queued" || updated.status === "stalled") {
      const cancelled = await prisma.importJob.updateMany({
        where: { id: job.id, status: { in: ["queued", "stalled"] } },
        data: { status: "cancelled", finishedAt: new Date(), errorSummary: "Cancelled before start" },
      });
      const fresh = await prisma.importJob.findUnique({ where: { id: job.id } });
      return res.json({ job: serializeJob(fresh), cancelled: cancelled.count > 0 });
    }
    res.json({ job: serializeJob(updated), message: "Cancel requested; job will stop at the next page boundary" });
  })
);

function serializeJob(job) {
  return {
    id: job.id,
    status: job.status,
    countryCodes: JSON.parse(job.countryCodesJson),
    indicatorCodes: JSON.parse(job.indicatorCodesJson),
    allCountries: JSON.parse(job.countryCodesJson).length === 0,
    yearStart: job.yearStart,
    yearEnd: job.yearEnd,
    counters: {
      imported: job.importedCount,
      updated: job.updatedCount,
      unchanged: job.unchangedCount,
      skipped: job.skippedCount,
      failed: job.failedCount,
      anomalies: job.anomalyCount,
    },
    pagesFetched: job.pagesFetched,
    pagesExpected: job.pagesExpected,
    cancelRequested: job.cancelRequested,
    checkpoint: job.checkpointJson ? JSON.parse(job.checkpointJson) : null,
    errorSummary: job.errorSummary,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    createdAt: job.createdAt,
    errorCount: job._count?.errors ?? job.errors?.length ?? 0,
    errors: job.errors
      ? job.errors.map((e) => ({
          id: e.id,
          page: e.page,
          countryCode: e.countryCode,
          indicatorCode: e.indicatorCode,
          year: e.year,
          sourceUrl: e.sourceUrl,
          httpStatus: e.httpStatus,
          message: e.message,
          createdAt: e.createdAt,
        }))
      : undefined,
  };
}
