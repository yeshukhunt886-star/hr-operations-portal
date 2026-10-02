CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    name VARCHAR(100) NOT NULL,

    email VARCHAR(255) NOT NULL,

    password_hash VARCHAR(255) NOT NULL,

    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_users_email (email),

    INDEX idx_users_active (is_active),

    INDEX idx_users_role (role)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;



CREATE TABLE documents (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    owner_id BIGINT UNSIGNED NOT NULL,

    original_filename VARCHAR(255) NOT NULL,

    stored_filename VARCHAR(255) NOT NULL,

    storage_key VARCHAR(500) NOT NULL,

    mime_type VARCHAR(150) NOT NULL,

    file_size BIGINT UNSIGNED NOT NULL,

    file_hash CHAR(64) NULL,

    category VARCHAR(100) NULL,

    description VARCHAR(500) NULL,

    status ENUM(
        'uploading',
        'active',
        'deleted',
        'failed'
    ) NOT NULL DEFAULT 'uploading',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    deleted_at DATETIME NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uq_documents_storage_key (storage_key),

    INDEX idx_documents_owner (owner_id),

    INDEX idx_documents_status (status),

    INDEX idx_documents_category (category),

    INDEX idx_documents_created_at (created_at),

    INDEX idx_documents_owner_status (owner_id, status),

    CONSTRAINT fk_documents_owner
        FOREIGN KEY (owner_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE document_shares (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    document_id BIGINT UNSIGNED NOT NULL,

    shared_with_user_id BIGINT UNSIGNED NOT NULL,

    permission ENUM(
        'read',
        'download'
    ) NOT NULL DEFAULT 'read',

    granted_by_user_id BIGINT UNSIGNED NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    revoked_at DATETIME NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uq_document_shared_user (
        document_id,
        shared_with_user_id
    ),

    INDEX idx_shares_document (document_id),

    INDEX idx_shares_user (shared_with_user_id),

    INDEX idx_shares_active (
        document_id,
        shared_with_user_id,
        revoked_at
    ),

    CONSTRAINT fk_shares_document
        FOREIGN KEY (document_id)
        REFERENCES documents(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_shares_recipient
        FOREIGN KEY (shared_with_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_shares_granted_by
        FOREIGN KEY (granted_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE share_links (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    document_id BIGINT UNSIGNED NOT NULL,

    token_hash CHAR(64) NOT NULL,

    expires_at DATETIME NOT NULL,

    max_uses INT UNSIGNED NULL,

    use_count INT UNSIGNED NOT NULL DEFAULT 0,

    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,

    created_by_user_id BIGINT UNSIGNED NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    revoked_at DATETIME NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uq_share_links_token_hash (token_hash),

    INDEX idx_share_links_document (document_id),

    INDEX idx_share_links_expiry (expires_at),

    INDEX idx_share_links_active (
        is_revoked,
        expires_at
    ),

    CONSTRAINT fk_share_links_document
        FOREIGN KEY (document_id)
        REFERENCES documents(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_share_links_creator
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE document_audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    user_id BIGINT UNSIGNED NULL,

    document_id BIGINT UNSIGNED NULL,

    share_id BIGINT UNSIGNED NULL,

    share_link_id BIGINT UNSIGNED NULL,

    action VARCHAR(50) NOT NULL,

    success BOOLEAN NOT NULL DEFAULT TRUE,

    ip_address VARCHAR(45) NULL,

    user_agent VARCHAR(500) NULL,

    metadata JSON NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_audit_user (user_id),

    INDEX idx_audit_document (document_id),

    INDEX idx_audit_action (action),

    INDEX idx_audit_created_at (created_at),

    INDEX idx_audit_document_created (
        document_id,
        created_at
    ),

    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_audit_document
        FOREIGN KEY (document_id)
        REFERENCES documents(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_audit_share
        FOREIGN KEY (share_id)
        REFERENCES document_shares(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_audit_share_link
        FOREIGN KEY (share_link_id)
        REFERENCES share_links(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;