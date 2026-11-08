-- D1 database: yokozuna-analytics  (already created; this file is for re-creating it)
CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_source TEXT NOT NULL,      -- value of ?from= (lowercase a-z 0-9 _ -, otherwise 'other')
  path TEXT,                      -- page path
  visited_at TEXT NOT NULL,       -- UTC ISO time
  visit_date TEXT NOT NULL,       -- JST date YYYY-MM-DD
  visitor_hash TEXT NOT NULL      -- SHA-256(salt|JST date|IP|UA), first 32 hex chars. No raw IP stored
);
CREATE INDEX IF NOT EXISTS idx_visits_date_from ON visits(visit_date, from_source);
