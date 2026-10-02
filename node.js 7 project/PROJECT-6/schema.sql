CREATE DATABASE IF NOT EXISTS smart_logistics;

USE smart_logistics;

CREATE TABLE locations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    code VARCHAR(50) NOT NULL UNIQUE,

    name VARCHAR(255) NOT NULL,

    latitude DECIMAL(10, 7) NULL,

    longitude DECIMAL(10, 7) NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE connections (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    source_location_id BIGINT NOT NULL,

    destination_location_id BIGINT NOT NULL,

    weight DECIMAL(12, 2) NOT NULL,

    is_directed BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_connection_source
        FOREIGN KEY (source_location_id)
        REFERENCES locations(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_connection_destination
        FOREIGN KEY (destination_location_id)
        REFERENCES locations(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_connection_weight
        CHECK (weight >= 0),

    UNIQUE (
        source_location_id,
        destination_location_id,
        is_directed
    ),

    INDEX idx_connection_source (
        source_location_id
    ),

    INDEX idx_connection_destination (
        destination_location_id
    )
);

CREATE TABLE delivery_tasks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    source_external_id VARCHAR(100) UNIQUE,

    source_location_id BIGINT NOT NULL,

    destination_location_id BIGINT NOT NULL,

    customer_name VARCHAR(255),

    priority INT NOT NULL DEFAULT 3,

    deadline DATETIME NULL,

    status ENUM(
        'PENDING',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (source_location_id)
        REFERENCES locations(id),

    FOREIGN KEY (destination_location_id)
        REFERENCES locations(id),

    INDEX idx_delivery_priority (
        priority
    ),

    INDEX idx_delivery_status (
        status
    ),

    INDEX idx_delivery_deadline (
        deadline
    )
);

CREATE TABLE bulk_import_jobs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    original_filename VARCHAR(255),

    status ENUM(
        'PENDING',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'CANCELLED',
        'EMPTY'
    ) NOT NULL DEFAULT 'PENDING',

    processed_rows BIGINT NOT NULL DEFAULT 0,

    successful_rows BIGINT NOT NULL DEFAULT 0,

    failed_rows BIGINT NOT NULL DEFAULT 0,

    started_at DATETIME NULL,

    completed_at DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bulk_import_errors (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    job_id BIGINT NOT NULL,

    row_number BIGINT NOT NULL,

    row_data JSON NULL,

    error_message TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (job_id)
        REFERENCES bulk_import_jobs(id)
        ON DELETE CASCADE,

    INDEX idx_import_error_job (
        job_id
    )
);

CREATE TABLE graph_versions (
    id INT PRIMARY KEY,

    version BIGINT NOT NULL DEFAULT 1,

    updated_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO graph_versions (id, version)
VALUES (1, 1)
ON DUPLICATE KEY UPDATE id = id;