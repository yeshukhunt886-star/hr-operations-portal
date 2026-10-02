export const config = {
  port: Number(process.env.PORT || 3001),
  wbBaseUrl: process.env.WB_BASE_URL || "https://api.worldbank.org/v2",
  wbTimeoutMs: Number(process.env.WB_TIMEOUT_MS || 20000),
  wbMaxRetries: Number(process.env.WB_MAX_RETRIES || 4),
  wbConcurrency: Number(process.env.WB_CONCURRENCY || 2),
  wbPerPage: Number(process.env.WB_PER_PAGE || 1000),
  jobStallMs: Number(process.env.JOB_STALL_MS || 180000),
  maxYearSpan: Number(process.env.MAX_YEAR_SPAN || 80),
  maxExportRows: Number(process.env.MAX_EXPORT_ROWS || 500000),
  minYear: 1960,
  maxYear: new Date().getFullYear() + 1,
  maxPageSize: 200,
};
