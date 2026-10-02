import { Router } from "express";
import { prisma } from "../prisma.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { config } from "../config.js";
import { parseQueryList, parseYear, capPage, SORT_ALLOWLIST } from "../services/validation.js";

export const analyticsRouter = Router();

analyticsRouter.get(
  "/compare",
  asyncHandler(async (req, res) => {
    const countries = parseQueryList(req.query.countries).map((c) => c.toUpperCase());
    const indicatorCode = String(req.query.indicator || "").trim();
    if (countries.length < 2) throw new HttpError(400, "Provide at least two country ISO2 codes");
    if (!indicatorCode) throw new HttpError(400, "indicator is required");
    const yearStart = parseYear(req.query.yearStart, "yearStart");
    const yearEnd = parseYear(req.query.yearEnd, "yearEnd");
    if (yearStart > yearEnd) throw new HttpError(400, "yearStart must not be after yearEnd");
    if (yearEnd - yearStart + 1 > config.maxYearSpan) {
      throw new HttpError(400, `Year range cannot exceed ${config.maxYearSpan} years`);
    }

    const indicator = await prisma.indicator.findUnique({ where: { code: indicatorCode } });
    if (!indicator) throw new HttpError(404, "Indicator not found in local database");

    const countryRows = await prisma.country.findMany({ where: { iso2Code: { in: countries } } });
    if (countryRows.length !== countries.length) {
      const found = new Set(countryRows.map((c) => c.iso2Code));
      throw new HttpError(400, `Unknown local country code(s): ${countries.filter((c) => !found.has(c)).join(", ")}`);
    }

    const values = await prisma.indicatorValue.findMany({
      where: {
        indicatorId: indicator.id,
        countryId: { in: countryRows.map((c) => c.id) },
        year: { gte: yearStart, lte: yearEnd },
      },
      include: { country: true },
      orderBy: [{ year: "asc" }, { country: { iso2Code: "asc" } }],
    });

    const years = [];
    for (let y = yearStart; y <= yearEnd; y++) years.push(y);

    const byCountry = {};
    for (const c of countryRows) {
      const series = years.map((year) => {
        const hit = values.find((v) => v.countryId === c.id && v.year === year);
        return {
          year,
          value: hit ? toNumber(hit.value) : null,
          missing: !hit || hit.value === null,
        };
      });
      byCountry[c.iso2Code] = {
        iso2Code: c.iso2Code,
        iso3Code: c.iso3Code,
        name: c.name,
        missingYears: series.filter((p) => p.missing).map((p) => p.year),
        series,
      };
    }

    res.json({ indicator, yearStart, yearEnd, countries: byCountry });
  })
);

analyticsRouter.get(
  "/trends",
  asyncHandler(async (req, res) => {
    const countryCode = String(req.query.country || "").toUpperCase();
    const indicatorCodes = parseQueryList(req.query.indicators);
    if (!countryCode) throw new HttpError(400, "country ISO2 code is required");
    if (!indicatorCodes.length) throw new HttpError(400, "indicators is required");
    const yearStart = parseYear(req.query.yearStart, "yearStart");
    const yearEnd = parseYear(req.query.yearEnd, "yearEnd");
    if (yearStart > yearEnd) throw new HttpError(400, "yearStart must not be after yearEnd");
    if (yearEnd - yearStart + 1 > config.maxYearSpan) {
      throw new HttpError(400, `Year range cannot exceed ${config.maxYearSpan} years`);
    }

    const country = await prisma.country.findUnique({ where: { iso2Code: countryCode } });
    if (!country) throw new HttpError(404, "Country not found in local database");
    const indicators = await prisma.indicator.findMany({ where: { code: { in: indicatorCodes } } });
    if (indicators.length !== indicatorCodes.length) {
      const found = new Set(indicators.map((i) => i.code));
      throw new HttpError(400, `Unknown local indicator(s): ${indicatorCodes.filter((c) => !found.has(c)).join(", ")}`);
    }

    const values = await prisma.indicatorValue.findMany({
      where: {
        countryId: country.id,
        indicatorId: { in: indicators.map((i) => i.id) },
        year: { gte: yearStart, lte: yearEnd },
      },
      include: { indicator: true },
      orderBy: [{ indicatorId: "asc" }, { year: "asc" }],
    });

    const years = [];
    for (let y = yearStart; y <= yearEnd; y++) years.push(y);

    const series = indicators.map((ind) => ({
      code: ind.code,
      name: ind.name,
      points: years.map((year) => {
        const hit = values.find((v) => v.indicatorId === ind.id && v.year === year);
        return { year, value: hit ? toNumber(hit.value) : null, missing: !hit || hit.value === null };
      }),
    }));

    res.json({ country, yearStart, yearEnd, series });
  })
);

analyticsRouter.get(
  "/rankings",
  asyncHandler(async (req, res) => {
    const indicatorCode = String(req.query.indicator || "").trim();
    if (!indicatorCode) throw new HttpError(400, "indicator is required");
    const year = parseYear(req.query.year, "year");
    const direction = req.query.order === "asc" ? "asc" : "desc";
    const { page, pageSize, skip } = capPage(req.query);
    const includeMissing = req.query.includeMissing === "true";
    const sortField = String(req.query.sort || "value");
    if (!SORT_ALLOWLIST.rankings.has(sortField)) {
      throw new HttpError(400, "sort must be one of: value, countryName, iso3Code");
    }

    const indicator = await prisma.indicator.findUnique({ where: { code: indicatorCode } });
    if (!indicator) throw new HttpError(404, "Indicator not found in local database");

    const where = {
      indicatorId: indicator.id,
      year,
      ...(includeMissing ? {} : { value: { not: null } }),
    };

    const orderBy =
      sortField === "countryName"
        ? [{ country: { name: "asc" } }, { country: { iso3Code: "asc" } }]
        : sortField === "iso3Code"
          ? [{ country: { iso3Code: "asc" } }]
          : [{ value: direction }, { country: { name: "asc" } }, { country: { iso3Code: "asc" } }];

    const [total, rows] = await Promise.all([
      prisma.indicatorValue.count({ where }),
      prisma.indicatorValue.findMany({
        where,
        include: { country: true },
        orderBy,
        skip,
        take: pageSize,
      }),
    ]);

    res.json({
      indicator,
      year,
      order: direction,
      page,
      pageSize,
      total,
      includeMissing,
      ranking: rows.map((r, idx) => ({
        rank: skip + idx + 1,
        iso2Code: r.country.iso2Code,
        iso3Code: r.country.iso3Code,
        countryName: r.country.name,
        value: toNumber(r.value),
        missing: r.value === null,
      })),
    });
  })
);

function toNumber(decimal) {
  if (decimal === null || decimal === undefined) return null;
  return Number(decimal.toString());
}
