import { ipcMain } from "electron";
import { getDb } from "../db/client";

export function registerBackupHandlers() {
  ipcMain.handle("backup:exportAll", (): string => {
    const db = getDb();
    const profile = db
      .prepare("SELECT context, updated_at as updatedAt FROM profile WHERE id = 1")
      .get();
    const settings = db
      .prepare(
        "SELECT api_provider as apiProvider, model, default_difficulty as defaultDifficulty, default_tone as defaultTone FROM settings WHERE id = 1"
      )
      .get();
    const jobs = db.prepare("SELECT * FROM jobs ORDER BY updated_at DESC").all();
    const scenarios = db.prepare("SELECT * FROM scenarios ORDER BY created_at ASC").all();
    // CVs excluded from JSON export (binary blobs)
    return JSON.stringify(
      { profile, settings, jobs, scenarios, exportedAt: new Date().toISOString() },
      null,
      2
    );
  });

  ipcMain.handle("backup:importAll", (_e, json: string) => {
    const data = JSON.parse(json);
    const db = getDb();

    const transaction = db.transaction(() => {
      if (data.profile) {
        db.prepare("UPDATE profile SET context = ?, updated_at = ? WHERE id = 1").run(
          data.profile.context || data.profile.context || "",
          data.profile.updatedAt || new Date().toISOString()
        );
      }

      if (data.settings) {
        const s = data.settings;
        db.prepare(
          "UPDATE settings SET api_provider = ?, model = ?, default_difficulty = ?, default_tone = ? WHERE id = 1"
        ).run(
          s.apiProvider || "openai",
          s.model || "gpt-4o-mini",
          s.defaultDifficulty || "medium",
          s.defaultTone || "realistic"
        );
      }

      if (Array.isArray(data.jobs)) {
        for (const j of data.jobs) {
          db.prepare(
            `INSERT OR REPLACE INTO jobs (id, company, role, job_description, status, notes, has_tailored_cv, current_step, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            j.id,
            j.company,
            j.role,
            j.jobDescription || j.job_description || "",
            j.status || "interested",
            j.notes || "",
            j.hasTailoredCv || j.has_tailored_cv ? 1 : 0,
            j.currentStep || j.current_step || 0,
            j.createdAt || j.created_at || new Date().toISOString(),
            j.updatedAt || j.updated_at || new Date().toISOString()
          );
        }
      }

      if (Array.isArray(data.scenarios)) {
        for (const s of data.scenarios) {
          db.prepare(
            `INSERT OR REPLACE INTO scenarios (id, job_id, title, type, questions, ai_suggestions, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            s.id,
            s.jobId || s.job_id,
            s.title,
            s.type,
            s.questions || "",
            s.aiSuggestions || s.ai_suggestions || "",
            s.notes || "",
            s.createdAt || s.created_at || new Date().toISOString(),
            s.updatedAt || s.updated_at || new Date().toISOString()
          );
        }
      }
    });

    transaction();
  });
}
