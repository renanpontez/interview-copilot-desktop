import { ipcMain } from "electron";
import { getDb } from "../db/client";
import type { AppSettings } from "../../types/domain";

// API key stored in-memory. Persisted to a `secrets` table in SQLite.
// Not as secure as Keychain but avoids native module ESM issues.
// The DB is local-only so the risk is minimal.
let _apiKey: string | null = null;

function ensureSecretsTable() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS secrets (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

function loadApiKey() {
  ensureSecretsTable();
  const row = getDb()
    .prepare("SELECT value FROM secrets WHERE key = 'api_key'")
    .get() as { value: string } | undefined;
  _apiKey = row?.value ?? null;
}

export function getStoredApiKey(): string | null {
  if (_apiKey === null) loadApiKey();
  return _apiKey;
}

export function registerSettingsHandlers() {
  // Load key on startup
  loadApiKey();

  ipcMain.handle("settings:get", (): AppSettings => {
    const row = getDb()
      .prepare(
        "SELECT api_provider as apiProvider, model, default_difficulty as defaultDifficulty, default_tone as defaultTone FROM settings WHERE id = 1"
      )
      .get() as AppSettings;
    return row;
  });

  ipcMain.handle(
    "settings:set",
    (_e, patch: Partial<AppSettings>): AppSettings => {
      const db = getDb();
      const current = db
        .prepare(
          "SELECT api_provider as apiProvider, model, default_difficulty as defaultDifficulty, default_tone as defaultTone FROM settings WHERE id = 1"
        )
        .get() as AppSettings;

      const next = { ...current, ...patch };
      db.prepare(
        "UPDATE settings SET api_provider = ?, model = ?, default_difficulty = ?, default_tone = ? WHERE id = 1"
      ).run(next.apiProvider, next.model, next.defaultDifficulty, next.defaultTone);

      return next;
    }
  );

  ipcMain.handle("settings:getApiKey", (): string | null => {
    return getStoredApiKey();
  });

  ipcMain.handle("settings:setApiKey", (_e, key: string) => {
    ensureSecretsTable();
    getDb()
      .prepare(
        "INSERT INTO secrets (key, value) VALUES ('api_key', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      )
      .run(key);
    _apiKey = key;
  });

  ipcMain.handle("settings:isWelcomeDismissed", (): boolean => {
    const row = getDb()
      .prepare("SELECT welcome_dismissed FROM settings WHERE id = 1")
      .get() as { welcome_dismissed: number };
    return Boolean(row.welcome_dismissed);
  });

  ipcMain.handle("settings:dismissWelcome", () => {
    getDb()
      .prepare("UPDATE settings SET welcome_dismissed = 1 WHERE id = 1")
      .run();
  });
}
