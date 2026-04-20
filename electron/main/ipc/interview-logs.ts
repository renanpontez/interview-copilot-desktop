import { ipcMain } from "electron";
import { getDb } from "../db/client";
import type { InterviewLog } from "../../types/domain";

function rowToLog(row: Record<string, unknown>): InterviewLog {
  return {
    id: row.id as string,
    scenarioId: row.scenario_id as string,
    jobId: row.job_id as string,
    messages: JSON.parse((row.messages as string) || "[]"),
    scores: JSON.parse((row.scores as string) || "[]"),
    summary: row.summary ? JSON.parse(row.summary as string) : null,
    userNotes: (row.user_notes as string) || "",
    userAiRating: (row.user_ai_rating as number) ?? null,
    userAiFeedback: (row.user_ai_feedback as string) || "",
    status: (row.status as InterviewLog["status"]) || "completed",
    durationSec: (row.duration_sec as number) || 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function registerInterviewLogHandlers() {
  ipcMain.handle("interviewLogs:save", (_e, log: InterviewLog) => {
    getDb()
      .prepare(
        `INSERT INTO interview_logs (id, scenario_id, job_id, messages, scores, summary, user_notes, user_ai_rating, user_ai_feedback, status, duration_sec, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           messages = excluded.messages,
           scores = excluded.scores,
           summary = excluded.summary,
           user_notes = excluded.user_notes,
           user_ai_rating = excluded.user_ai_rating,
           user_ai_feedback = excluded.user_ai_feedback,
           status = excluded.status,
           duration_sec = excluded.duration_sec,
           updated_at = excluded.updated_at`
      )
      .run(
        log.id,
        log.scenarioId,
        log.jobId,
        JSON.stringify(log.messages),
        JSON.stringify(log.scores),
        log.summary ? JSON.stringify(log.summary) : null,
        log.userNotes,
        log.userAiRating,
        log.userAiFeedback,
        log.status,
        log.durationSec,
        log.createdAt,
        log.updatedAt
      );
  });

  ipcMain.handle(
    "interviewLogs:listForScenario",
    (_e, scenarioId: string): InterviewLog[] => {
      const rows = getDb()
        .prepare(
          "SELECT * FROM interview_logs WHERE scenario_id = ? ORDER BY created_at DESC"
        )
        .all(scenarioId);
      return rows.map((r) => rowToLog(r as Record<string, unknown>));
    }
  );

  ipcMain.handle("interviewLogs:get", (_e, id: string): InterviewLog | null => {
    const row = getDb()
      .prepare("SELECT * FROM interview_logs WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? rowToLog(row) : null;
  });

  ipcMain.handle("interviewLogs:delete", (_e, id: string) => {
    getDb().prepare("DELETE FROM interview_logs WHERE id = ?").run(id);
  });
}
