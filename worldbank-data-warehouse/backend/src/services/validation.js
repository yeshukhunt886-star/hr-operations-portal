import { config } from "../config.js";
import { HttpError } from "../middleware/errors.js";

const ISO2 = /^[A-Za-z]{2}$/;
const INDICATOR = /^[A-Za-z0-9._]+$/;

export function parseYear(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new HttpError(400, `${field} must be an integer year`);
  if (n < config.minYear || n > config.maxYear) {
    throw new HttpError(400, `${field} must be between ${config.minYear} and ${config.maxYear}`);
  }
  return n;
}

export function parseImportInput(body) {
  const yearStart = parseYear(body?.yearStart, "yearStart");
  const yearEnd = parseYear(body?.yearEnd, "yearEnd");
  if (yearStart > yearEnd) throw new HttpError(400, "yearStart must not be after yearEnd");
  if (yearEnd - yearStart + 1 > config.maxYearSpan) {
    throw new HttpError(400, `Year range cannot exceed ${config.maxYearSpan} years`);
  }

  const indicatorCodes = uniqueCodes(body?.indicatorCodes, "indicatorCodes");
  if (!indicatorCodes.length) throw new HttpError(400, "At least one indicator code is required");
  for (const code of indicatorCodes) {
    if (!INDICATOR.test(code) || code.length > 32) {
      throw new HttpError(400, `Invalid indicator code: ${code}`);
    }
  }

  const allCountries = Boolean(body?.allCountries);
  let countryCodes = [];
  if (!allCountries) {
    countryCodes = uniqueCodes(body?.countryCodes, "countryCodes").map((c) => c.toUpperCase());
    if (!countryCodes.length) throw new HttpError(400, "Select countries or enable allCountries");
    for (const code of countryCodes) {
      if (!ISO2.test(code)) throw new HttpError(400, `Invalid country ISO2 code: ${code}`);
    }
  }

  return { yearStart, yearEnd, indicatorCodes, countryCodes, allCountries };
}

function uniqueCodes(value, field) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new HttpError(400, `${field} must be an array of codes`);
  return [...new Set(value.map((v) => String(v).trim()).filter(Boolean))];
}

export function configHash({ allCountries, countryCodes, indicatorCodes, yearStart, yearEnd }) {
  const countries = allCountries ? "ALL" : [...countryCodes].sort().join(",");
  const indicators = [...indicatorCodes].sort().join(",");
  return `${countries}|${indicators}|${yearStart}|${yearEnd}`;
}

export function parseQueryList(value) {
  if (!value) return [];
  return [...new Set(String(value).split(",").map((s) => s.trim()).filter(Boolean))];
}

export function capPage({ page, pageSize }) {
  const p = Math.max(1, Number(page) || 1);
  const size = Math.min(config.maxPageSize, Math.max(1, Number(pageSize) || 50));
  return { page: p, pageSize: size, skip: (p - 1) * size };
}

export const SORT_ALLOWLIST = {
  rankings: new Set(["value", "countryName", "iso3Code"]),
};
