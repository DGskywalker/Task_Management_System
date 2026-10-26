-- Task Management System: PostgreSQL schema
-- Run with: psql "$DATABASE_URL" -f schema.sql

CREATE TABLE IF NOT EXISTS users (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(100)  NOT NULL,
    email               VARCHAR(255)  NOT NULL UNIQUE,
    password            VARCHAR(255)  NOT NULL,          -- bcrypt hash
    reset_token         VARCHAR(64),                     -- password reset token (hex)
    reset_token_expires TIMESTAMPTZ,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(200)  NOT NULL,
    description TEXT,
    deadline    DATE,
    priority    VARCHAR(10)   CHECK (priority IN ('High', 'Medium', 'Low')),
    status      VARCHAR(20)   NOT NULL DEFAULT 'Not Started'
                              CHECK (status IN ('Not Started', 'In Progress', 'Completed')),
    notes       TEXT          DEFAULT '',
    category    VARCHAR(100),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
