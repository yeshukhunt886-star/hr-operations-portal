import { Router } from "express";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../middleware/errors.js";
import { fetchCountries } from "../services/worldbank.js";

export const catalogRouter = Router();

let countryCache = { at: 0, data: null };

catalogRouter.get(
  "/countries",
  asyncHandler(async (req, res) => {
    const local = req.query.source === "local";
    if (local) {
      const countries = await prisma.country.findMany({ orderBy: { name: "asc" } });
      return res.json({ source: "local", countries });
    }
    if (!countryCache.data || Date.now() - countryCache.at > 6 * 60 * 60 * 1000) {
      countryCache = { at: Date.now(), data: await fetchCountries() };
    }
    res.json({ source: "worldbank", countries: countryCache.data });
  })
);

catalogRouter.get(
  "/indicators",
  asyncHandler(async (_req, res) => {
    const indicators = await prisma.indicator.findMany({ orderBy: { name: "asc" } });
    res.json({ indicators });
  })
);

catalogRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [countries, indicators, facts, jobs, lastJob] = await Promise.all([
      prisma.country.count(),
      prisma.indicator.count(),
      prisma.indicatorValue.count(),
      prisma.importJob.count(),
      prisma.importJob.findFirst({ orderBy: { createdAt: "desc" } }),
    ]);
    const yearRange = await prisma.indicatorValue.aggregate({
      _min: { year: true },
      _max: { year: true },
    });
    res.json({
      countries,
      indicators,
      facts,
      jobs,
      yearMin: yearRange._min.year,
      yearMax: yearRange._max.year,
      lastJob: lastJob
        ? { id: lastJob.id, status: lastJob.status, createdAt: lastJob.createdAt }
        : null,
    });
  })
);
