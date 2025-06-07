BEGIN;

-- 1. Create scrape_sessions table
CREATE TABLE IF NOT EXISTS scrape_sessions (
  id              SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL
                     REFERENCES organizations(id)
                     ON DELETE CASCADE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  status          VARCHAR(20) NOT NULL,    -- running | success | error
  processed_count INTEGER DEFAULT 0,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add last_session_id and active flag to animals
ALTER TABLE animals
  ADD COLUMN IF NOT EXISTS last_session_id INTEGER
    REFERENCES scrape_sessions(id)
    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- 3. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_animals_last_session
  ON animals(last_session_id);
CREATE INDEX IF NOT EXISTS idx_animals_active
  ON animals(active);

COMMIT;