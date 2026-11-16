CREATE TABLE IF NOT EXISTS switch_orders (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED')),
  assigned_operator_id TEXT,
  version INTEGER NOT NULL CHECK (version > 0),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE switch_orders
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';


CREATE INDEX IF NOT EXISTS switch_orders_status_idx
  ON switch_orders (status);

CREATE TABLE IF NOT EXISTS outbox_events (
  event_id UUID PRIMARY KEY,
  event_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  aggregate_version INTEGER NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PUBLISHED')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS outbox_events_pending_idx
  ON outbox_events (status, available_at, created_at);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  operation_id TEXT PRIMARY KEY,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
