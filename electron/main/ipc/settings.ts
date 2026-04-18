import { ipcMain } from "electron";
import { getDb } from "../db/client";
import type { AppSettings } from "../../types/domain";

// API key stored in memory for now; Phase 5 moves to Keychain via keytar.
let _apiKey = "";

export function getStoredApiKey(): string | null {
  return _apiKey || null;
}

export function registerSettingsHandlers() {
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
    return _apiKey || null;
  });

  ipcMain.handle("settings:setApiKey", (_e, key: string) => {
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
