-- PlanTim: tabela verzija aplikacije (app_versions)

CREATE TABLE IF NOT EXISTS app_versions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    version VARCHAR(20) NOT NULL,
    version_name VARCHAR(255) NULL,
    changelog JSON NULL,
    release_notes TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 0,
    is_latest TINYINT(1) NOT NULL DEFAULT 0,
    released_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    UNIQUE KEY app_versions_version_unique (version),
    KEY app_versions_version_index (version),
    KEY app_versions_is_active_index (is_active),
    KEY app_versions_is_latest_index (is_latest)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
