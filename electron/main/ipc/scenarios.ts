import { ipcMain } from "electron";
import { getDb } from "../db/client";
import type { Scenario } from "../../types/domain";

function rowToScenario(row: Record<string, unknown>): Scenario {
  return {
    id: row.id as string,
    jobId: row.job_id as string,
    title: row.title as string,
    type: row.type as Scenario["type"],
    questions: row.questions as string,
    aiSuggestions: row.ai_suggestions as string,
    notes: row.notes as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function registerScenarioHandlers() {
  ipcMain.handle("scenarios:listForJob", (_e, jobId: string): Scenario[] => {
    const rows = getDb()
      .prepare("SELECT * FROM scenarios WHERE job_id = ? ORDER BY created_at ASC")
      .all(jobId);
    return rows.map((r) => rowToScenario(r as Record<string, unknown>));
  });

  ipcMain.handle("scenarios:save", (_e, sc: Scenario) => {
    getDb()
      .prepare(
        `INSERT INTO scenarios (id, job_id, title, type, questions, ai_suggestions, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           type = excluded.type,
           questions = excluded.questions,
           ai_suggestions = excluded.ai_suggestions,
           notes = excluded.notes,
           updated_at = excluded.updated_at`
      )
      .run(
        sc.id,
        sc.jobId,
        sc.title,
        sc.type,
        sc.questions,
        sc.aiSuggestions,
        sc.notes,
        sc.createdAt,
        sc.updatedAt
      );
  });

  ipcMain.handle("scenarios:delete", (_e, id: string) => {
    getDb().prepare("DELETE FROM scenarios WHERE id = ?").run(id);
  });
}
