import Database from "better-sqlite3";
import { app } from "electron";
import { join } from "node:path";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema";

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = join(app.getPath("userData"), "interview-copilot.db");
  _db = new Database(dbPath);

  // Performance: WAL mode + foreign keys
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  // Run schema
  _db.exec(SCHEMA_SQL);

  // Check version
  const row = _db.prepare("SELECT version FROM schema_version LIMIT 1").get() as
    | { version: number }
    | undefined;
  if (!row) {
    _db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(SCHEMA_VERSION);
  }

  // Seed defaults if tables are empty
  const profile = _db
    .prepare("SELECT id FROM profile WHERE id = 1")
    .get();
  if (!profile) {
    _db.prepare(
      "INSERT INTO profile (id, context, updated_at) VALUES (1, '', datetime('now'))"
    ).run();
  }

  const settings = _db
    .prepare("SELECT id FROM settings WHERE id = 1")
    .get();
  if (!settings) {
    _db.prepare(
      "INSERT INTO settings (id) VALUES (1)"
    ).run();
  }

  return _db;
}

export function closeDb() {
  _db?.close();
  _db = null;
}
