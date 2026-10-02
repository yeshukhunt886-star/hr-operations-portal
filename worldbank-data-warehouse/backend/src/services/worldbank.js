import { config } from "../config.js";
import { logger } from "../logger.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class WorldBankError extends Error {
  constructor(message, extras = {}) {
    super(message);
    this.name = "WorldBankError";
    Object.assign(this, extras);
  }
}

function backoffMs(attempt, retryAfterHeader) {
  if (retryAfterHeader) {
    const sec = Number(retryAfterHeader);
    if (Number.isFinite(sec) && sec > 0) return Math.min(sec * 1000, 30000);
  }
  return Math.min(1000 * 2 ** attempt, 16000);
}

export async function wbFetch(path, { signal, query } = {}) {
  const url = new URL(path.startsWith("http") ? path : `${config.wbBaseUrl}${path}`);
  url.searchParams.set("format", "json");
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  let lastError;
  for (let attempt = 0; attempt <= config.wbMaxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.wbTimeoutMs);
    const onParentAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timeout);
        throw new WorldBankError("Request cancelled", { cancelled: true, sourceUrl: url.toString() });
      }
      signal.addEventListener("abort", onParentAbort, { once: true });
    }

    try {
      const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      if (res.status === 429 || res.status === 503) {
        lastError = new WorldBankError(`World Bank API rate-limited (${res.status})`, {
          httpStatus: res.status,
          sourceUrl: url.toString(),
          timeout: false,
        });
        if (attempt === config.wbMaxRetries) throw lastError;
        await sleep(backoffMs(attempt, res.headers.get("retry-after")));
        continue;
      }
      if (res.status >= 500) {
        lastError = new WorldBankError(`World Bank API server error (${res.status})`, {
          httpStatus: res.status,
          sourceUrl: url.toString(),
        });
        if (attempt === config.wbMaxRetries) throw lastError;
        await sleep(backoffMs(attempt));
        continue;
      }
      if (!res.ok) {
        throw new WorldBankError(`World Bank API error (${res.status})`, {
          httpStatus: res.status,
          sourceUrl: url.toString(),
        });
      }

      let body;
      try {
        body = await res.json();
      } catch {
        throw new WorldBankError("World Bank API returned malformed JSON", {
          httpStatus: res.status,
          sourceUrl: url.toString(),
          malformed: true,
        });
      }
      return { body, sourceUrl: url.toString(), httpStatus: res.status };
    } catch (err) {
      if (signal?.aborted) {
        throw new WorldBankError("Request cancelled", { cancelled: true, sourceUrl: url.toString() });
      }
      const timedOut = err?.name === "AbortError" || err?.name === "TimeoutError";
      if (timedOut) {
        lastError = new WorldBankError("World Bank API request timed out", {
          timeout: true,
          sourceUrl: url.toString(),
        });
        logger.warn({ sourceUrl: url.toString(), attempt }, "WB timeout");
        if (attempt === config.wbMaxRetries) throw lastError;
        await sleep(backoffMs(attempt));
        continue;
      }
      if (err instanceof WorldBankError) {
        if (err.httpStatus && err.httpStatus < 500 && err.httpStatus !== 429) throw err;
        lastError = err;
        if (attempt === config.wbMaxRetries) throw err;
        await sleep(backoffMs(attempt));
        continue;
      }
      lastError = new WorldBankError(err.message || "World Bank API unavailable", {
        sourceUrl: url.toString(),
        unavailable: true,
      });
      if (attempt === config.wbMaxRetries) throw lastError;
      await sleep(backoffMs(attempt));
    } finally {
      clearTimeout(timeout);
      if (signal) signal.removeEventListener("abort", onParentAbort);
    }
  }
  throw lastError;
}

export function parsePageEnvelope(body, sourceUrl) {
  if (!Array.isArray(body) || body.length < 1 || typeof body[0] !== "object" || body[0] === null) {
    throw new WorldBankError("Unexpected World Bank response shape", { sourceUrl, malformed: true });
  }
  const meta = body[0];
  if (meta.message) {
    const msg = Array.isArray(meta.message) ? meta.message[0]?.value || "API message" : String(meta.message);
    throw new WorldBankError(msg, { sourceUrl, httpStatus: 400, apiMessage: true });
  }
  const rows = Array.isArray(body[1]) ? body[1] : [];
  return {
    page: Number(meta.page) || 1,
    pages: Number(meta.pages) || 0,
    perPage: Number(meta.per_page) || rows.length,
    total: meta.total === undefined || meta.total === null ? null : Number(meta.total),
    sourceLastUpdated: meta.lastupdated || null,
    sourceId: meta.sourceid || null,
    rows,
  };
}

export async function fetchCountries({ signal } = {}) {
  const { body, sourceUrl } = await wbFetch("/country", { signal, query: { per_page: 400 } });
  const page = parsePageEnvelope(body, sourceUrl);
  return page.rows
    .filter((c) => c?.id && c.region?.id && c.region.id !== "NA")
    .map((c) => ({
      iso2Code: String(c.iso2Code || c.id).toUpperCase(),
      iso3Code: String(c.id).toUpperCase(),
      name: c.name,
      regionCode: c.region?.id || null,
      regionName: c.region?.value || null,
      incomeLevelCode: c.incomeLevel?.id || null,
      incomeLevelName: c.incomeLevel?.value || null,
      capitalCity: c.capitalCity || null,
      longitude: c.longitude || null,
      latitude: c.latitude || null,
    }));
}

export async function fetchIndicatorMeta(code, { signal } = {}) {
  const { body, sourceUrl } = await wbFetch(`/indicator/${encodeURIComponent(code)}`, { signal });
  const page = parsePageEnvelope(body, sourceUrl);
  const row = page.rows[0];
  if (!row?.id) {
    throw new WorldBankError(`Unknown indicator code: ${code}`, { sourceUrl, httpStatus: 404 });
  }
  return {
    code: String(row.id),
    name: row.name || row.id,
    sourceNote: row.sourceNote || null,
    sourceOrganization: row.sourceOrganization || null,
    unit: row.unit || null,
  };
}

export async function fetchIndicatorPage({ countryCodes, indicatorCode, yearStart, yearEnd, page, signal }) {
  const countryPath = countryCodes === "all" ? "all" : countryCodes.join(";");
  const path = `/country/${countryPath}/indicator/${encodeURIComponent(indicatorCode)}`;
  const { body, sourceUrl, httpStatus } = await wbFetch(path, {
    signal,
    query: {
      date: `${yearStart}:${yearEnd}`,
      per_page: config.wbPerPage,
      page,
    },
  });
  const envelope = parsePageEnvelope(body, sourceUrl);
  return { ...envelope, sourceUrl, httpStatus };
}

export function observationKey(row) {
  const country = row?.countryiso3code || row?.country?.id || "";
  const indicator = row?.indicator?.id || "";
  const year = row?.date || "";
  return `${country}|${indicator}|${year}`;
}
