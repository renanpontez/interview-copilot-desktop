import { ipcMain } from "electron";
import { getDb } from "../db/client";
import type { Profile } from "../../types/domain";

export function registerProfileHandlers() {
  ipcMain.handle("profile:get", (): Profile => {
    const row = getDb()
      .prepare("SELECT context, updated_at as updatedAt FROM profile WHERE id = 1")
      .get() as { context: string; updatedAt: string };
    return { context: row.context, updatedAt: row.updatedAt };
  });

  ipcMain.handle("profile:set", (_e, context: string): Profile => {
    const now = new Date().toISOString();
    getDb()
      .prepare("UPDATE profile SET context = ?, updated_at = ? WHERE id = 1")
      .run(context, now);
    return { context, updatedAt: now };
  });
}
