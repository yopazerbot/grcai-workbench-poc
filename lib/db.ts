import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { env } from "./env";
import { DDL, SCHEMA_VERSION } from "./schema";
import { seedKnowledge } from "./seed/lumeo";
import { seedDemoRuns } from "./seed/demo-runs";

declare global {
  var __grcaiDb: Database.Database | undefined;
}

// Lazy singleton: the DB is opened (and seeded) on first runtime access, never
// at build time — on Railway the volume only exists at runtime. Caching on
// globalThis survives dev-mode hot reloads.
export function getDb(): Database.Database {
  if (globalThis.__grcaiDb) return globalThis.__grcaiDb;

  const path = resolve(env.DATABASE_PATH);
  mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path);
  db.pragma("busy_timeout = 5000");
  try {
    // Deliberately NOT WAL: WAL mmaps a shared-memory file, which
    // segfaults the process on some mounted volume filesystems (seen on
    // Railway). DELETE journal needs no mmap, and single-analyst traffic
    // doesn't need WAL concurrency. Also converts dbs created by older
    // builds that enabled WAL.
    db.pragma("journal_mode = DELETE");
  } catch {}
  console.log(
    `[db] opened ${path} (journal=${JSON.stringify(db.pragma("journal_mode", { simple: true }))})`
  );

  ensureSchema(db);

  // The singleton must be set before seeding: seed modules call getDb().
  globalThis.__grcaiDb = db;
  seedIfEmpty(db);
  return db;
}

/**
 * Demo store, not a production database: a db created by an older schema
 * version is wiped and re-seeded rather than migrated in place. The version
 * check MUST run before the DDL — the DDL's `CREATE INDEX IF NOT EXISTS` on
 * new columns fails against old tables.
 */
function ensureSchema(db: Database.Database): void {
  const version = storedSchemaVersion(db);
  if (version !== null && version !== SCHEMA_VERSION) {
    console.log(`[db] schema ${version} → ${SCHEMA_VERSION}: resetting demo database`);
    dropAllTables(db);
  }
  try {
    db.exec(DDL);
  } catch (err) {
    // A database of an unrecognised shape (e.g. created before versioning
    // existed): reset it rather than leave the app unusable.
    console.warn(
      `[db] schema initialisation failed (${err instanceof Error ? err.message : String(err)}); resetting demo database`
    );
    dropAllTables(db);
    db.exec(DDL);
  }
}

/** null when the database is fresh (no meta table yet); "0" when meta exists without a version. */
function storedSchemaVersion(db: Database.Database): string | null {
  const meta = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'meta'`)
    .get();
  if (!meta) {
    const anyTable = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`)
      .get();
    return anyTable ? "0" : null;
  }
  const row = db.prepare(`SELECT value FROM meta WHERE key = 'schema_version'`).get() as
    | { value: string }
    | undefined;
  return row?.value ?? "0";
}

function dropAllTables(db: Database.Database): void {
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`)
    .all() as Array<{ name: string }>;
  db.transaction(() => {
    for (const t of tables) db.exec(`DROP TABLE IF EXISTS "${t.name.replace(/"/g, '""')}"`);
  })();
}

function seedIfEmpty(db: Database.Database): void {
  const now = new Date();

  const docCount = (db.prepare("SELECT COUNT(*) AS c FROM documents").get() as { c: number }).c;
  if (docCount === 0) {
    seedKnowledge(db, now);
  }
  const meta = db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)");
  meta.run("schema_version", SCHEMA_VERSION);
  if (docCount === 0) meta.run("seeded_at", now.toISOString());

  const runCount = (db.prepare("SELECT COUNT(*) AS c FROM runs").get() as { c: number }).c;
  if (runCount === 0) {
    seedDemoRuns(db, now);
  }
}
