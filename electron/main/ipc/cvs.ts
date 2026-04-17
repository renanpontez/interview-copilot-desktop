import { ipcMain } from "electron";
import { getDb } from "../db/client";
import type { StoredCv } from "../../types/domain";

function getRow(id: string): StoredCv | null {
  const row = getDb()
    .prepare("SELECT file_name, blob FROM cvs WHERE id = ?")
    .get(id) as { file_name: string; blob: Buffer } | undefined;
  if (!row) return null;
  return { fileName: row.file_name, blob: new Uint8Array(row.blob) };
}

function upsert(id: string, data: Uint8Array, fileName: string) {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO cvs (id, file_name, blob, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET file_name = excluded.file_name, blob = excluded.blob, updated_at = excluded.updated_at`
    )
    .run(id, fileName, Buffer.from(data), now);
}

export function registerCvHandlers() {
  ipcMain.handle("cvs:getBase", (): StoredCv | null => getRow("base"));

  ipcMain.handle("cvs:setBase", (_e, data: Uint8Array, fileName: string) => {
    upsert("base", data, fileName);
  });

  ipcMain.handle("cvs:deleteBase", () => {
    getDb().prepare("DELETE FROM cvs WHERE id = 'base'").run();
  });

  ipcMain.handle("cvs:getForJob", (_e, jobId: string): StoredCv | null =>
    getRow(`job:${jobId}`)
  );

  ipcMain.handle(
    "cvs:setForJob",
    (_e, jobId: string, data: Uint8Array, fileName: string) => {
      upsert(`job:${jobId}`, data, fileName);
    }
  );

  ipcMain.handle("cvs:cloneBaseToJob", (_e, jobId: string): StoredCv | null => {
    const base = getRow("base");
    if (!base) return null;
    upsert(`job:${jobId}`, base.blob, base.fileName);
    return base;
  });

  ipcMain.handle("cvs:deleteForJob", (_e, jobId: string) => {
    getDb().prepare("DELETE FROM cvs WHERE id = ?").run(`job:${jobId}`);
  });
}
