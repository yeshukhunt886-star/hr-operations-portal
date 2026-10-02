import { Prisma } from "@prisma/client";
import pLimit from "p-limit";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { prisma } from "../prisma.js";
import {
  WorldBankError,
  fetchCountries,
  fetchIndicatorMeta,
  fetchIndicatorPage,
  observationKey,
} from "./worldbank.js";

const ACTIVE = new Set(["queued", "running"]);
const TERMINAL = new Set(["success", "partial", "failed", "cancelled"]);

function json(value) {
  return JSON.stringify(value);
}

async function recordError(jobId, fields) {
  await prisma.importJobError.create({
    data: {
      jobId,
      page: fields.page ?? null,
      countryCode: fields.countryCode ?? null,
      indicatorCode: fields.indicatorCode ?? null,
      year: fields.year ?? null,
      sourceUrl: fields.sourceUrl ?? null,
      httpStatus: fields.httpStatus ?? null,
      message: fields.message.slice(0, 2000),
      contextJson: fields.context ? json(fields.context).slice(0, 4000) : null,
    },
  });
}

async function bump(jobId, data) {
  return prisma.importJob.update({ where: { id: jobId }, data });
}

async function loadJob(id) {
  return prisma.importJob.findUnique({ where: { id } });
}

async function shouldCancel(jobId) {
  const job = await loadJob(jobId);
  return Boolean(job?.cancelRequested);
}

function parseValue(raw) {
  if (raw === null || raw === undefined || raw === "") return { kind: "missing" };
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return { kind: "invalid", reason: "non-finite number" };
    return { kind: "number", decimal: new Prisma.Decimal(String(raw)) };
  }
  const text = String(raw).trim();
  if (!text) return { kind: "missing" };
  if (!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(text)) {
    return { kind: "invalid", reason: "non-numeric value" };
  }
  const digits = text.replace(/[-.eE+]/g, "");
  if (digits.length > 30) return { kind: "invalid", reason: "numeric value exceeds supported precision" };
  return { kind: "number", decimal: new Prisma.Decimal(text) };
}

async function upsertMasterCountries(countries) {
  const map = new Map();
  for (const c of countries) {
    const row = await prisma.country.upsert({
      where: { iso2Code: c.iso2Code },
      create: c,
      update: {
        name: c.name,
        iso3Code: c.iso3Code,
        regionCode: c.regionCode,
        regionName: c.regionName,
        incomeLevelCode: c.incomeLevelCode,
        incomeLevelName: c.incomeLevelName,
        capitalCity: c.capitalCity,
        longitude: c.longitude,
        latitude: c.latitude,
      },
    });
    map.set(c.iso2Code, row);
    map.set(c.iso3Code, row);
  }
  return map;
}

async function upsertMasterIndicator(meta) {
  return prisma.indicator.upsert({
    where: { code: meta.code },
    create: meta,
    update: {
      name: meta.name,
      sourceNote: meta.sourceNote,
      sourceOrganization: meta.sourceOrganization,
      unit: meta.unit,
    },
  });
}

async function persistBatch({ jobId, indicatorId, countryByCode, rows, sourceLastUpdated }) {
  const counters = { imported: 0, updated: 0, unchanged: 0, skipped: 0, failed: 0 };
  const prepared = [];

  for (const row of rows) {
    const iso2 = String(row?.country?.id || "").toUpperCase();
    const iso3 = String(row?.countryiso3code || "").toUpperCase();
    const country = countryByCode.get(iso2) || countryByCode.get(iso3);
    const year = Number(row?.date);
    if (!country || !Number.isInteger(year)) {
      counters.failed += 1;
      await recordError(jobId, {
        countryCode: iso2 || iso3 || null,
        year: Number.isInteger(year) ? year : null,
        message: "Skipped record: unknown country or year after validation",
        context: { hasCountry: Boolean(country), date: row?.date },
      });
      continue;
    }
    const parsed = parseValue(row.value);
    if (parsed.kind === "invalid") {
      counters.failed += 1;
      await recordError(jobId, {
        countryCode: iso2,
        year,
        message: parsed.reason,
        context: { valueType: typeof row.value },
      });
      continue;
    }
    prepared.push({
      countryId: country.id,
      indicatorId,
      year,
      value: parsed.kind === "number" ? parsed.decimal : null,
      missing: parsed.kind === "missing",
      sourceLastUpdated: sourceLastUpdated || null,
    });
  }

  if (!prepared.length) return counters;

  const CHUNK = 150;
  for (let i = 0; i < prepared.length; i += CHUNK) {
    const chunk = prepared.slice(i, i + CHUNK);
    await prisma.$transaction(async (tx) => {
      for (const item of chunk) {
        const existing = await tx.indicatorValue.findUnique({
          where: {
            countryId_indicatorId_year: {
              countryId: item.countryId,
              indicatorId: item.indicatorId,
              year: item.year,
            },
          },
        });

        if (!existing) {
          await tx.indicatorValue.create({
            data: {
              countryId: item.countryId,
              indicatorId: item.indicatorId,
              year: item.year,
              value: item.value,
              sourceLastUpdated: item.sourceLastUpdated,
              importJobId: jobId,
            },
          });
          if (item.missing) counters.skipped += 1;
          else counters.imported += 1;
          continue;
        }

        const oldVal = existing.value === null ? null : existing.value.toString();
        const newVal = item.value === null ? null : item.value.toString();
        if (oldVal === newVal) {
          counters.unchanged += 1;
          continue;
        }
        await tx.indicatorValue.update({
          where: { id: existing.id },
          data: {
            value: item.value,
            sourceLastUpdated: item.sourceLastUpdated,
            importJobId: jobId,
          },
        });
        counters.updated += 1;
      }
    });
  }

  return counters;
}

async function finishJob(jobId, fallbackStatus, errorSummary) {
  const job = await loadJob(jobId);
  if (!job || TERMINAL.has(job.status)) return job;

  let status = fallbackStatus;
  if (job.cancelRequested) status = "cancelled";
  else if (fallbackStatus === "success" && job.failedCount > 0) status = "partial";

  try {
    return await prisma.importJob.update({
      where: { id: jobId, status: "running" },
      data: { status, finishedAt: new Date(), errorSummary: errorSummary || job.errorSummary },
    });
  } catch {
    return loadJob(jobId);
  }
}

export async function runImportJob(jobId) {
  const claimed = await prisma.importJob.updateMany({
    where: { id: jobId, status: { in: ["queued", "stalled"] } },
    data: { status: "running", startedAt: new Date() },
  });
  if (!claimed.count) {
    const current = await loadJob(jobId);
    if (current?.status === "running") {
      logger.info({ jobId }, "Job already running");
    }
    return;
  }

  const abort = new AbortController();
  let job = await loadJob(jobId);
  const countryCodes = JSON.parse(job.countryCodesJson);
  const indicatorCodes = JSON.parse(job.indicatorCodesJson);
  const allCountries = countryCodes.length === 0;

  try {
    const catalog = await fetchCountries({ signal: abort.signal });
    const requested = allCountries ? catalog : catalog.filter((c) => countryCodes.includes(c.iso2Code));
    if (!allCountries) {
      const known = new Set(catalog.map((c) => c.iso2Code));
      const unknown = countryCodes.filter((c) => !known.has(c));
      if (unknown.length) {
        throw Object.assign(new Error(`Unknown country code(s): ${unknown.join(", ")}`), { httpStatus: 400 });
      }
    }
    if (!requested.length) throw new Error("No matching countries to import");

    const countryByCode = await upsertMasterCountries(requested);
    const iso2List = requested.map((c) => c.iso2Code);

    const limit = pLimit(config.wbConcurrency);
    const seenPageFingerprints = new Map();

    for (const indicatorCode of indicatorCodes) {
      if (await shouldCancel(jobId)) {
        abort.abort();
        await finishJob(jobId, "cancelled", "Cancelled by user");
        return;
      }

      let indicator;
      try {
        const meta = await fetchIndicatorMeta(indicatorCode, { signal: abort.signal });
        indicator = await upsertMasterIndicator(meta);
      } catch (err) {
        await recordError(jobId, {
          indicatorCode,
          sourceUrl: err.sourceUrl,
          httpStatus: err.httpStatus,
          message: err.message || "Failed to load indicator metadata",
        });
        await bump(jobId, { failedCount: { increment: 1 }, errorSummary: err.message });
        if (err instanceof WorldBankError && (err.httpStatus === 404 || err.apiMessage)) {
          continue;
        }
        throw err;
      }

      const countryChunks = allCountries ? ["all"] : chunk(iso2List, 25);

      for (const countryArg of countryChunks) {
      let page = 1;
      let pages = 1;

      while (page <= pages) {
        if (await shouldCancel(jobId)) {
          abort.abort();
          await finishJob(jobId, "cancelled", "Cancelled by user");
          return;
        }

        let envelope;
        try {
          envelope = await limit(() =>
            fetchIndicatorPage({
              countryCodes: countryArg,
              indicatorCode,
              yearStart: job.yearStart,
              yearEnd: job.yearEnd,
              page,
              signal: abort.signal,
            })
          );
        } catch (err) {
          if (err.cancelled) {
            await finishJob(jobId, "cancelled", "Cancelled by user");
            return;
          }
          await recordError(jobId, {
            indicatorCode,
            page,
            sourceUrl: err.sourceUrl,
            httpStatus: err.httpStatus,
            message: err.message || "Page fetch failed",
          });
          await bump(jobId, { failedCount: { increment: 1 }, errorSummary: err.message });
          throw err;
        }

        pages = envelope.pages || 1;
        if (envelope.total === 0 && page === 1) {
          await recordError(jobId, {
            indicatorCode,
            page,
            sourceUrl: envelope.sourceUrl,
            message: "API returned no observations for this indicator/year range",
          });
          await bump(jobId, { skippedCount: { increment: 1 }, pagesFetched: { increment: 1 }, pagesExpected: pages });
          break;
        }

        if ((!envelope.rows || envelope.rows.length === 0) && page < pages) {
          await recordError(jobId, {
            indicatorCode,
            page,
            sourceUrl: envelope.sourceUrl,
            message: "Empty page before expected end of pagination; stopping this indicator",
          });
          await bump(jobId, { anomalyCount: { increment: 1 }, pagesFetched: { increment: 1 } });
          break;
        }

        const fingerprint = envelope.rows.map(observationKey).join(";");
        const fpKey = `${indicatorCode}:${Array.isArray(countryArg) ? countryArg.join(",") : countryArg}:${page}`;
        if (seenPageFingerprints.has(fingerprint) && seenPageFingerprints.get(fingerprint) !== fpKey) {
          await recordError(jobId, {
            indicatorCode,
            page,
            sourceUrl: envelope.sourceUrl,
            message: `Pagination anomaly: page repeats data already seen (${seenPageFingerprints.get(fingerprint)})`,
          });
          await bump(jobId, { anomalyCount: { increment: 1 } });
        }
        seenPageFingerprints.set(fingerprint, fpKey);

        const filteredRows = allCountries
          ? envelope.rows.filter((r) => countryByCode.has(String(r?.country?.id || "").toUpperCase()) || countryByCode.has(String(r?.countryiso3code || "").toUpperCase()))
          : envelope.rows.filter((r) => {
              const iso2 = String(r?.country?.id || "").toUpperCase();
              return iso2List.includes(iso2);
            });

        const c = await persistBatch({
          jobId,
          indicatorId: indicator.id,
          countryByCode,
          rows: filteredRows,
          sourceLastUpdated: envelope.sourceLastUpdated,
        });

        await bump(jobId, {
          importedCount: { increment: c.imported },
          updatedCount: { increment: c.updated },
          unchangedCount: { increment: c.unchanged },
          skippedCount: { increment: c.skipped },
          failedCount: { increment: c.failed },
          pagesFetched: { increment: 1 },
          pagesExpected: pages,
          checkpointJson: json({ indicatorCode, page, pages, sourceLastUpdated: envelope.sourceLastUpdated }),
        });

        await prisma.syncWatermark.upsert({
          where: {
            indicatorCode_countryScope_yearStart_yearEnd: {
              indicatorCode,
              countryScope: allCountries ? "ALL" : iso2List.sort().join(","),
              yearStart: job.yearStart,
              yearEnd: job.yearEnd,
            },
          },
          create: {
            indicatorCode,
            countryScope: allCountries ? "ALL" : iso2List.sort().join(","),
            yearStart: job.yearStart,
            yearEnd: job.yearEnd,
            sourceLastUpdated: envelope.sourceLastUpdated,
            lastJobId: jobId,
          },
          update: { sourceLastUpdated: envelope.sourceLastUpdated, lastJobId: jobId },
        });

        page += 1;
        if (pages === 0) break;
      }
      }
    }

    job = await loadJob(jobId);
    await finishJob(jobId, job.failedCount > 0 || job.anomalyCount > 0 ? "partial" : "success");
  } catch (err) {
    logger.error({ jobId, err: err.message }, "Import job failed");
    await recordError(jobId, {
      sourceUrl: err.sourceUrl,
      httpStatus: err.httpStatus,
      message: err.message || "Import failed",
    });
    await finishJob(jobId, "failed", err.message || "Import failed");
  }
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export { ACTIVE, TERMINAL };
