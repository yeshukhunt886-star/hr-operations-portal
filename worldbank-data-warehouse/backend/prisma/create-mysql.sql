CREATE DATABASE IF NOT EXISTS worldbank_warehouse
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE worldbank_warehouse;

CREATE TABLE IF NOT EXISTS `countries` (
  `id` VARCHAR(191) NOT NULL,
  `iso2Code` VARCHAR(8) NOT NULL,
  `iso3Code` VARCHAR(8) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `regionCode` VARCHAR(16) NULL,
  `regionName` VARCHAR(128) NULL,
  `incomeLevelCode` VARCHAR(16) NULL,
  `incomeLevelName` VARCHAR(128) NULL,
  `capitalCity` VARCHAR(128) NULL,
  `longitude` VARCHAR(191) NULL,
  `latitude` VARCHAR(191) NULL,
  `sourceLastUpdated` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `countries_iso2Code_key` (`iso2Code`),
  UNIQUE KEY `countries_iso3Code_key` (`iso3Code`),
  KEY `countries_regionCode_idx` (`regionCode`),
  KEY `countries_incomeLevelCode_idx` (`incomeLevelCode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `indicators` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(512) NOT NULL,
  `sourceNote` TEXT NULL,
  `sourceOrganization` TEXT NULL,
  `unit` VARCHAR(64) NULL,
  `sourceLastUpdated` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `indicators_code_key` (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `import_jobs` (
  `id` VARCHAR(191) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'queued',
  `configHash` VARCHAR(512) NOT NULL,
  `countryCodesJson` TEXT NOT NULL,
  `indicatorCodesJson` TEXT NOT NULL,
  `yearStart` INTEGER NOT NULL,
  `yearEnd` INTEGER NOT NULL,
  `importedCount` INTEGER NOT NULL DEFAULT 0,
  `updatedCount` INTEGER NOT NULL DEFAULT 0,
  `unchangedCount` INTEGER NOT NULL DEFAULT 0,
  `skippedCount` INTEGER NOT NULL DEFAULT 0,
  `failedCount` INTEGER NOT NULL DEFAULT 0,
  `pagesFetched` INTEGER NOT NULL DEFAULT 0,
  `pagesExpected` INTEGER NULL,
  `anomalyCount` INTEGER NOT NULL DEFAULT 0,
  `cancelRequested` BOOLEAN NOT NULL DEFAULT false,
  `checkpointJson` TEXT NULL,
  `errorSummary` TEXT NULL,
  `startedAt` DATETIME(3) NULL,
  `finishedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `import_jobs_status_createdAt_idx` (`status`, `createdAt`),
  KEY `import_jobs_configHash_status_idx` (`configHash`, `status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `indicator_values` (
  `id` VARCHAR(191) NOT NULL,
  `countryId` VARCHAR(191) NOT NULL,
  `indicatorId` VARCHAR(191) NOT NULL,
  `year` INTEGER NOT NULL,
  `value` DECIMAL(38, 10) NULL,
  `sourceLastUpdated` VARCHAR(32) NULL,
  `importJobId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `indicator_values_countryId_indicatorId_year_key` (`countryId`, `indicatorId`, `year`),
  KEY `indicator_values_indicatorId_year_countryId_idx` (`indicatorId`, `year`, `countryId`),
  KEY `indicator_values_countryId_indicatorId_year_idx` (`countryId`, `indicatorId`, `year`),
  KEY `indicator_values_year_idx` (`year`),
  KEY `indicator_values_importJobId_idx` (`importJobId`),
  CONSTRAINT `indicator_values_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `countries` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `indicator_values_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `indicators` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `indicator_values_importJobId_fkey` FOREIGN KEY (`importJobId`) REFERENCES `import_jobs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `import_job_errors` (
  `id` VARCHAR(191) NOT NULL,
  `jobId` VARCHAR(191) NOT NULL,
  `page` INTEGER NULL,
  `countryCode` VARCHAR(8) NULL,
  `indicatorCode` VARCHAR(64) NULL,
  `year` INTEGER NULL,
  `sourceUrl` TEXT NULL,
  `httpStatus` INTEGER NULL,
  `message` TEXT NOT NULL,
  `contextJson` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `import_job_errors_jobId_createdAt_idx` (`jobId`, `createdAt`),
  CONSTRAINT `import_job_errors_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `import_jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sync_watermarks` (
  `id` VARCHAR(191) NOT NULL,
  `indicatorCode` VARCHAR(64) NOT NULL,
  `countryScope` VARCHAR(255) NOT NULL,
  `yearStart` INTEGER NOT NULL,
  `yearEnd` INTEGER NOT NULL,
  `sourceLastUpdated` VARCHAR(32) NULL,
  `lastJobId` VARCHAR(191) NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sync_watermarks_indicatorCode_countryScope_yearStart_yearEnd_key` (`indicatorCode`, `countryScope`, `yearStart`, `yearEnd`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
