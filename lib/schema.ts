// SQLite DDL, executed on every startup (idempotent). Bump SCHEMA_VERSION when
// the shape changes: the db layer wipes and re-seeds a database with an older
// version (this is a demo store; run history is seed-derived and disposable).

export const SCHEMA_VERSION = "2";

export const TABLES = [
  "audit_log",
  "run_items",
  "runs",
  "org_knowledge",
  "documents",
  "meta",
] as const;

export const DDL = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'awaiting_analysis',
  text TEXT NOT NULL DEFAULT '',
  summary TEXT,
  page_count INTEGER,
  error TEXT,
  model TEXT,
  uploaded_by_name TEXT NOT NULL,
  uploaded_by_email TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  analysed_at TEXT,
  seeded INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded ON documents(uploaded_at DESC);

CREATE TABLE IF NOT EXISTS org_knowledge (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  ref_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data_json TEXT,
  document_id TEXT REFERENCES documents(id),
  anchor TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_org_cat ON org_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_org_doc ON org_knowledge(document_id);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'drafting',
  input_json TEXT NOT NULL,
  input_summary TEXT NOT NULL,
  error TEXT,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_by_name TEXT NOT NULL,
  created_by_email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_created ON runs(created_at DESC);

CREATE TABLE IF NOT EXISTS run_items (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  data_json TEXT NOT NULL,
  original_json TEXT NOT NULL,
  flagged INTEGER NOT NULL DEFAULT 0,
  flag_reason TEXT,
  edited_at TEXT,
  decided_at TEXT,
  decided_by_name TEXT,
  decided_by_email TEXT
);
CREATE INDEX IF NOT EXISTS idx_items_run ON run_items(run_id, position);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  agent_id TEXT,
  run_id TEXT,
  item_id TEXT,
  document_id TEXT,
  details_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_run ON audit_log(run_id);
`;
