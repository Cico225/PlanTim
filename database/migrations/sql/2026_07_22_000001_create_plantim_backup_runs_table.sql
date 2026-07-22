-- PlanTim: historija punih backupova (baza + zip projekta)

CREATE TABLE IF NOT EXISTS plantim_backup_runs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    trigger_type VARCHAR(20) NOT NULL DEFAULT 'manual' COMMENT 'manual|scheduled',
    status VARCHAR(20) NOT NULL DEFAULT 'running' COMMENT 'running|success|failed',
    db_filename VARCHAR(255) NULL,
    zip_filename VARCHAR(255) NULL,
    destination_path VARCHAR(500) NULL,
    zip_size BIGINT UNSIGNED NULL,
    db_size BIGINT UNSIGNED NULL,
    error_message TEXT NULL,
    email_sent TINYINT(1) NOT NULL DEFAULT 0,
    email_recipients TEXT NULL,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_plantim_backup_runs_status (status),
    INDEX idx_plantim_backup_runs_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
