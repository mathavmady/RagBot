-- Syllabex MySQL Schema (Reference — JPA auto-generates DDL via ddl-auto=update)
-- Run this manually if you prefer to manage the schema yourself.
-- Set spring.jpa.hibernate.ddl-auto=validate when using this file.

CREATE DATABASE IF NOT EXISTS syllabex_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE syllabex_db;

CREATE TABLE IF NOT EXISTS users (
    id                      BIGINT          NOT NULL AUTO_INCREMENT,
    name                    VARCHAR(255)    NOT NULL,
    email                   VARCHAR(255)    NOT NULL UNIQUE,
    password                VARCHAR(255),
    role                    VARCHAR(20)     NOT NULL,
    department              VARCHAR(255),
    active                  TINYINT(1)      NOT NULL DEFAULT 1,
    requires_password_setup TINYINT(1)      NOT NULL DEFAULT 0,
    google_subject_id       VARCHAR(255),
    profile_picture_url     VARCHAR(1000),
    created_at              DATETIME(6)     NOT NULL,
    updated_at              DATETIME(6)     NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_users_email  (email),
    INDEX idx_users_role   (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_sessions (
    id          BIGINT          NOT NULL AUTO_INCREMENT,
    session_id  VARCHAR(100)    NOT NULL UNIQUE,
    title       VARCHAR(200)    DEFAULT 'New Chat',
    user_id     BIGINT          NOT NULL,
    created_at  DATETIME(6)     NOT NULL,
    updated_at  DATETIME(6)     NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_session_user       (user_id),
    INDEX idx_session_session_id (session_id),
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chats (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    question            TEXT            NOT NULL,
    answer              MEDIUMTEXT,
    sources_json        TEXT,
    status              VARCHAR(20)     DEFAULT 'success',
    model_used          VARCHAR(100),
    source_file_filter  VARCHAR(255),
    session_id          BIGINT          NOT NULL,
    user_id             BIGINT          NOT NULL,
    created_at          DATETIME(6)     NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_chat_session (session_id),
    INDEX idx_chat_user    (user_id),
    INDEX idx_chat_created (created_at),
    CONSTRAINT fk_chat_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_user    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS documents (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    filename        VARCHAR(255)    NOT NULL,
    original_name   VARCHAR(255)    NOT NULL,
    file_type       VARCHAR(10),
    file_size       BIGINT,
    total_pages     INT,
    total_chunks    INT,
    status          VARCHAR(20)     DEFAULT 'indexed',
    uploaded_by     BIGINT,
    uploaded_at     DATETIME(6)     NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_doc_filename (filename),
    CONSTRAINT fk_doc_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
