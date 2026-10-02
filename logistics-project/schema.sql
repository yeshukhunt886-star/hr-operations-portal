-- Smart Logistics Route & Bulk Delivery Processor
-- MySQL schema

CREATE DATABASE IF NOT EXISTS logistics_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE logistics_db;

-- ---------------------------------------------------------------
-- graph_meta: single-row table tracking the current graph version.
-- Every location/connection mutation that can affect route answers
-- must increment this. Cache keys embed this version (edge case #13, #35).
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS graph_meta (
  id TINYINT PRIMARY KEY DEFAULT 1,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO graph_meta (id, version) VALUES (1, 1)
  ON DUPLICATE KEY UPDATE id = id;

-- ---------------------------------------------------------------
-- locations: graph nodes
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- connections: weighted, directed edges between locations.
-- Direction is explicit (edge case #8). Zero weight allowed,
-- negative weight rejected at the application layer (#9, #10).
-- Uniqueness enforced per (from,to) direction (#7).
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_location_id INT NOT NULL,
  to_location_id INT NOT NULL,
  weight DOUBLE NOT NULL,
  bidirectional TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_edge (from_location_id, to_location_id),
  CONSTRAINT fk_conn_from FOREIGN KEY (from_location_id) REFERENCES locations(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_conn_to FOREIGN KEY (to_location_id) REFERENCES locations(id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_weight_non_negative CHECK (weight >= 0)
);

-- ---------------------------------------------------------------
-- delivery_tasks: priority-queue backed delivery scheduling
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delivery_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source_id VARCHAR(255) DEFAULT NULL, -- external/CSV row id, used for import idempotency (#26)
  location_id INT NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  priority INT NOT NULL,          -- 1 (most urgent) .. 10 (least urgent)
  deadline DATETIME DEFAULT NULL,
  status ENUM('pending','in_progress','done','cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_source_id (source_id),
  CONSTRAINT fk_task_location FOREIGN KEY (location_id) REFERENCES locations(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_priority_range CHECK (priority BETWEEN 1 AND 10)
);

-- ---------------------------------------------------------------
-- bulk_import_jobs: tracks streaming CSV import jobs
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bulk_import_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(500) NOT NULL,
  status ENUM('running','completed','failed','cancelled','empty') NOT NULL DEFAULT 'running',
  total_rows INT NOT NULL DEFAULT 0,
  processed INT NOT NULL DEFAULT 0,
  success INT NOT NULL DEFAULT 0,
  failed INT NOT NULL DEFAULT 0,
  rows_per_sec DOUBLE DEFAULT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL DEFAULT NULL
);

-- ---------------------------------------------------------------
-- bulk_import_errors: per-row error context for reproducing bad rows
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bulk_import_errors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  row_number INT NOT NULL,
  raw_row TEXT,
  error_message VARCHAR(1000),
  CONSTRAINT fk_error_job FOREIGN KEY (job_id) REFERENCES bulk_import_jobs(id)
    ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- route_history: optional log of computed route queries
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS route_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_location_id INT NOT NULL,
  to_location_id INT NOT NULL,
  distance DOUBLE DEFAULT NULL,
  reachable TINYINT(1) NOT NULL,
  graph_version BIGINT NOT NULL,
  from_cache TINYINT(1) NOT NULL DEFAULT 0,
  computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_priority ON delivery_tasks (status, priority, deadline, created_at);
CREATE INDEX idx_connections_from ON connections (from_location_id);
CREATE INDEX idx_connections_to ON connections (to_location_id);


