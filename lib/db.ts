import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { env } from "./env";
import { DDL } from "./schema";
import { buildOrgKnowledgeRows } from "./seed/org-data";
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
    // WAL is a performance nicety only — some mounted volume filesystems
    // refuse it (shared-memory files), and the default journal works fine.
    db.pragma("journal_mode = WAL");
  } catch {}
  db.exec(DDL);
  seedIfEmpty(db);

  globalThis.__grcaiDb = db;
  return db;
}

function seedIfEmpty(db: Database.Database): void {
  const now = new Date();

  const orgCount = (
    db.prepare("SELECT COUNT(*) AS c FROM org_knowledge").get() as { c: number }
  ).c;
  if (orgCount === 0) {
    const insert = db.prepare(
      `INSERT INTO org_knowledge (id, category, ref_id, title, body, data_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    db.transaction(() => {
      for (const r of buildOrgKnowledgeRows(now)) {
        insert.run(
          r.id,
          r.category,
          r.refId,
          r.title,
          r.body,
          r.data == null ? null : JSON.stringify(r.data),
          now.toISOString()
        );
      }
      const meta = db.prepare(
        "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)"
      );
      meta.run("schema_version", "1");
      meta.run("seeded_at", now.toISOString());
    })();
  }

  const runCount = (
    db.prepare("SELECT COUNT(*) AS c FROM runs").get() as { c: number }
  ).c;
  if (runCount === 0) {
    seedDemoRuns(db, now);
  }
}
