import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { env } from "./env";
import { DDL, SCHEMA_VERSION, TABLES } from "./schema";
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
  db.exec(DDL);
  migrateIfNeeded(db);
  // The singleton must be set before seeding: seed modules call getDb().
  globalThis.__grcaiDb = db;
  seedIfEmpty(db);
  return db;
}

/**
 * Demo store, not a production database: a db created by an older schema
 * version is wiped and re-seeded rather than migrated in place.
 */
function migrateIfNeeded(db: Database.Database): void {
  const row = db.prepare(`SELECT value FROM meta WHERE key = 'schema_version'`).get() as
    | { value: string }
    | undefined;
  if (!row || row.value === SCHEMA_VERSION) return;
  console.log(`[db] schema ${row.value} → ${SCHEMA_VERSION}: resetting demo database`);
  db.transaction(() => {
    for (const t of TABLES) db.exec(`DROP TABLE IF EXISTS ${t}`);
  })();
  db.exec(DDL);
}

function seedIfEmpty(db: Database.Database): void {
  const now = new Date();

  const docCount = (db.prepare("SELECT COUNT(*) AS c FROM documents").get() as { c: number }).c;
  if (docCount === 0) {
    seedKnowledge(db, now);
    const meta = db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)");
    meta.run("schema_version", SCHEMA_VERSION);
    meta.run("seeded_at", now.toISOString());
  }

  const runCount = (db.prepare("SELECT COUNT(*) AS c FROM runs").get() as { c: number }).c;
  if (runCount === 0) {
    seedDemoRuns(db, now);
  }
}
