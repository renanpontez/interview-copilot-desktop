import { ipcMain } from "electron";
import { getDb } from "../db/client";
import type { AppSettings } from "../../types/domain";

const SERVICE = "interview-copilot";
const ACCOUNT = "api-key";

// Dynamically import keytar (native module)
async function getKeytar() {
  try {
    return await import("keytar");
  } catch {
    return null;
  }
}

// Fallback: in-memory store if keytar unavailable
let _fallbackKey = "";

export async function getStoredApiKey(): Promise<string | null> {
  const kt = await getKeytar();
  if (kt) {
    const key = await kt.getPassword(SERVICE, ACCOUNT);
    return key || null;
  }
  return _fallbackKey || null;
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

  ipcMain.handle("settings:getApiKey", async (): Promise<string | null> => {
    return getStoredApiKey();
  });

  ipcMain.handle("settings:setApiKey", async (_e, key: string) => {
    const kt = await getKeytar();
    if (kt) {
      if (key) {
        await kt.setPassword(SERVICE, ACCOUNT, key);
      } else {
        await kt.deletePassword(SERVICE, ACCOUNT);
      }
    } else {
      _fallbackKey = key;
    }
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
