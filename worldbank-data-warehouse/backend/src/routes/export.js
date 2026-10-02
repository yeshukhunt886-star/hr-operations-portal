import { Router } from "express";
import { stringify } from "csv-stringify";
import { prisma } from "../prisma.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { config } from "../config.js";
import { parseQueryList, parseYear } from "../services/validation.js";

export const exportRouter = Router();

exportRouter.get(
  "/csv",
  asyncHandler(async (req, res) => {
    const countries = parseQueryList(req.query.countries).map((c) => c.toUpperCase());
    const indicators = parseQueryList(req.query.indicators);
    const yearStart = parseYear(req.query.yearStart || config.minYear, "yearStart");
    const yearEnd = parseYear(req.query.yearEnd || config.maxYear, "yearEnd");
    if (yearStart > yearEnd) throw new HttpError(400, "yearStart must not be after yearEnd");
    if (yearEnd - yearStart + 1 > config.maxYearSpan) {
      throw new HttpError(400, `Year range cannot exceed ${config.maxYearSpan} years`);
    }

    const where = { year: { gte: yearStart, lte: yearEnd } };
    if (countries.length) {
      const rows = await prisma.country.findMany({ where: { iso2Code: { in: countries } } });
      where.countryId = { in: rows.map((c) => c.id) };
    }
    if (indicators.length) {
      const rows = await prisma.indicator.findMany({ where: { code: { in: indicators } } });
      where.indicatorId = { in: rows.map((i) => i.id) };
    }

    const total = await prisma.indicatorValue.count({ where });
    if (total > config.maxExportRows) {
      throw new HttpError(400, `Export would return ${total} rows; cap is ${config.maxExportRows}. Narrow filters.`);
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="warehouse-export.csv"');

    const stringifier = stringify({
      header: true,
      columns: ["iso2", "iso3", "country", "indicator_code", "indicator_name", "year", "value", "missing"],
    });

    let aborted = false;
    req.on("close", () => {
      aborted = true;
    });
    stringifier.on("error", () => {
      if (!res.headersSent) res.status(500).end();
    });
    stringifier.pipe(res);

    const batchSize = 1000;
    let cursor = null;
    let sent = 0;

    try {
      while (!aborted && sent < total) {
        const batch = await prisma.indicatorValue.findMany({
          where,
          include: { country: true, indicator: true },
          orderBy: { id: "asc" },
          take: batchSize,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });
        if (!batch.length) break;
        for (const row of batch) {
          if (aborted) break;
          const ok = stringifier.write({
            iso2: row.country.iso2Code,
            iso3: row.country.iso3Code,
            country: row.country.name,
            indicator_code: row.indicator.code,
            indicator_name: row.indicator.name,
            year: row.year,
            value: row.value === null ? "" : row.value.toString(),
            missing: row.value === null ? "true" : "false",
          });
          if (ok === false) {
            await new Promise((resolve) => stringifier.once("drain", resolve));
          }
        }
        cursor = batch[batch.length - 1].id;
        sent += batch.length;
      }
    } finally {
      stringifier.end();
    }
  })
);
