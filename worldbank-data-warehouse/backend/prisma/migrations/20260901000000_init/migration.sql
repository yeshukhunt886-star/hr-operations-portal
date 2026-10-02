-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "iso2Code" TEXT NOT NULL,
    "iso3Code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regionCode" TEXT,
    "regionName" TEXT,
    "incomeLevelCode" TEXT,
    "incomeLevelName" TEXT,
    "capitalCity" TEXT,
    "longitude" TEXT,
    "latitude" TEXT,
    "sourceLastUpdated" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "countries_iso2Code_key" ON "countries"("iso2Code");
CREATE UNIQUE INDEX "countries_iso3Code_key" ON "countries"("iso3Code");
CREATE INDEX "countries_regionCode_idx" ON "countries"("regionCode");
CREATE INDEX "countries_incomeLevelCode_idx" ON "countries"("incomeLevelCode");

CREATE TABLE "indicators" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceNote" TEXT,
    "sourceOrganization" TEXT,
    "unit" TEXT,
    "sourceLastUpdated" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "indicators_code_key" ON "indicators"("code");

CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "configHash" TEXT NOT NULL,
    "countryCodesJson" TEXT NOT NULL,
    "indicatorCodesJson" TEXT NOT NULL,
    "yearStart" INTEGER NOT NULL,
    "yearEnd" INTEGER NOT NULL,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "unchangedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "pagesFetched" INTEGER NOT NULL DEFAULT 0,
    "pagesExpected" INTEGER,
    "anomalyCount" INTEGER NOT NULL DEFAULT 0,
    "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
    "checkpointJson" TEXT,
    "errorSummary" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "import_jobs_status_createdAt_idx" ON "import_jobs"("status", "createdAt");
CREATE INDEX "import_jobs_configHash_status_idx" ON "import_jobs"("configHash", "status");

CREATE TABLE "indicator_values" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryId" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" DECIMAL,
    "sourceLastUpdated" TEXT,
    "importJobId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "indicator_values_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "indicator_values_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "indicators" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "indicator_values_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "import_jobs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "indicator_values_countryId_indicatorId_year_key" ON "indicator_values"("countryId", "indicatorId", "year");
CREATE INDEX "indicator_values_indicatorId_year_countryId_idx" ON "indicator_values"("indicatorId", "year", "countryId");
CREATE INDEX "indicator_values_countryId_indicatorId_year_idx" ON "indicator_values"("countryId", "indicatorId", "year");
CREATE INDEX "indicator_values_year_idx" ON "indicator_values"("year");
CREATE INDEX "indicator_values_importJobId_idx" ON "indicator_values"("importJobId");

CREATE TABLE "import_job_errors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "page" INTEGER,
    "countryCode" TEXT,
    "indicatorCode" TEXT,
    "year" INTEGER,
    "sourceUrl" TEXT,
    "httpStatus" INTEGER,
    "message" TEXT NOT NULL,
    "contextJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "import_job_errors_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "import_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "import_job_errors_jobId_createdAt_idx" ON "import_job_errors"("jobId", "createdAt");

CREATE TABLE "sync_watermarks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "indicatorCode" TEXT NOT NULL,
    "countryScope" TEXT NOT NULL,
    "yearStart" INTEGER NOT NULL,
    "yearEnd" INTEGER NOT NULL,
    "sourceLastUpdated" TEXT,
    "lastJobId" TEXT,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "sync_watermarks_indicatorCode_countryScope_yearStart_yearEnd_key" ON "sync_watermarks"("indicatorCode", "countryScope", "yearStart", "yearEnd");
