-- ==========================================================
-- ExamGuard AI: MySQL Database Schema
-- ==========================================================

CREATE DATABASE IF NOT EXISTS examguard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE examguard;

-- 1. Exam Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    answer_key TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Minute-by-Minute Telemetry & Metrics
CREATE TABLE IF NOT EXISTS metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    timestamp VARCHAR(30) NOT NULL,
    active_users INT DEFAULT 0,
    response_time_ms FLOAT DEFAULT 0.0,
    cpu_usage_pct FLOAT DEFAULT 0.0,
    memory_usage_pct FLOAT DEFAULT 0.0,
    db_query_time_ms FLOAT DEFAULT 0.0,
    bandwidth_mbps FLOAT DEFAULT 0.0,
    error_count INT DEFAULT 0,
    INDEX idx_session_time (session_id, timestamp),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Student Complaints
CREATE TABLE IF NOT EXISTS complaints (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    timestamp VARCHAR(30) NOT NULL,
    complaint_text TEXT NOT NULL,
    INDEX idx_complaints_session (session_id),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Apache Server Logs
CREATE TABLE IF NOT EXISTS apache_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    timestamp VARCHAR(30) NOT NULL,
    level VARCHAR(20),
    message TEXT NOT NULL,
    INDEX idx_logs_session (session_id),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Root Cause Analysis Reports
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT UNIQUE NOT NULL,
    report_markdown MEDIUMTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

