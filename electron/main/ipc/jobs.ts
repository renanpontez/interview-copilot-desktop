import { ipcMain } from "electron";
import { getDb } from "../db/client";
import type { Job } from "../../types/domain";

function rowToJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    company: row.company as string,
    role: row.role as string,
    jobDescription: row.job_description as string,
    status: row.status as Job["status"],
    notes: row.notes as string,
    hasTailoredCv: Boolean(row.has_tailored_cv),
    currentStep: (row.current_step as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function registerJobHandlers() {
  ipcMain.handle("jobs:list", (): Job[] => {
    const rows = getDb()
      .prepare("SELECT * FROM jobs ORDER BY updated_at DESC")
      .all();
    return rows.map((r) => rowToJob(r as Record<string, unknown>));
  });

  ipcMain.handle("jobs:get", (_e, id: string): Job | null => {
    const row = getDb()
      .prepare("SELECT * FROM jobs WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? rowToJob(row) : null;
  });

  ipcMain.handle("jobs:save", (_e, job: Job) => {
    const db = getDb();
    db.prepare(
      `INSERT INTO jobs (id, company, role, job_description, status, notes, has_tailored_cv, current_step, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         company = excluded.company,
         role = excluded.role,
         job_description = excluded.job_description,
         status = excluded.status,
         notes = excluded.notes,
         has_tailored_cv = excluded.has_tailored_cv,
         current_step = excluded.current_step,
         updated_at = excluded.updated_at`
    ).run(
      job.id,
      job.company,
      job.role,
      job.jobDescription,
      job.status,
      job.notes,
      job.hasTailoredCv ? 1 : 0,
      job.currentStep ?? 0,
      job.createdAt,
      job.updatedAt
    );
  });

  ipcMain.handle("jobs:delete", (_e, id: string) => {
    const db = getDb();
    db.prepare("DELETE FROM scenarios WHERE job_id = ?").run(id);
    db.prepare("DELETE FROM cvs WHERE id = ?").run(`job:${id}`);
    db.prepare("DELETE FROM jobs WHERE id = ?").run(id);
  });
}
