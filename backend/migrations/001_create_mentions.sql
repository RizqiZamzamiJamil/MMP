CREATE TABLE IF NOT EXISTS mentions (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT NOT NULL,
  source TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  url TEXT NOT NULL,
  author TEXT,
  published_at TIMESTAMPTZ,
  engagement INTEGER NOT NULL DEFAULT 0 CHECK (engagement >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mentions_external_id_url_key UNIQUE (external_id, url)
);

CREATE INDEX IF NOT EXISTS mentions_source_idx ON mentions (source);
CREATE INDEX IF NOT EXISTS mentions_published_at_idx ON mentions (published_at);
CREATE INDEX IF NOT EXISTS mentions_engagement_idx ON mentions (engagement DESC);
