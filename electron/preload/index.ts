import { contextBridge, ipcRenderer, shell } from "electron";

const api = {
  profile: {
    get: () => ipcRenderer.invoke("profile:get"),
    set: (context: string) => ipcRenderer.invoke("profile:set", context),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    set: (patch: Record<string, unknown>) => ipcRenderer.invoke("settings:set", patch),
    getApiKey: () => ipcRenderer.invoke("settings:getApiKey"),
    setApiKey: (key: string) => ipcRenderer.invoke("settings:setApiKey", key),
    isWelcomeDismissed: () => ipcRenderer.invoke("settings:isWelcomeDismissed"),
    dismissWelcome: () => ipcRenderer.invoke("settings:dismissWelcome"),
  },
  jobs: {
    list: () => ipcRenderer.invoke("jobs:list"),
    get: (id: string) => ipcRenderer.invoke("jobs:get", id),
    save: (job: Record<string, unknown>) => ipcRenderer.invoke("jobs:save", job),
    delete: (id: string) => ipcRenderer.invoke("jobs:delete", id),
  },
  scenarios: {
    listForJob: (jobId: string) => ipcRenderer.invoke("scenarios:listForJob", jobId),
    save: (sc: Record<string, unknown>) => ipcRenderer.invoke("scenarios:save", sc),
    delete: (id: string) => ipcRenderer.invoke("scenarios:delete", id),
  },
  cvs: {
    getBase: () => ipcRenderer.invoke("cvs:getBase"),
    setBase: (data: Uint8Array, fileName: string) =>
      ipcRenderer.invoke("cvs:setBase", data, fileName),
    deleteBase: () => ipcRenderer.invoke("cvs:deleteBase"),
    getForJob: (jobId: string) => ipcRenderer.invoke("cvs:getForJob", jobId),
    setForJob: (jobId: string, data: Uint8Array, fileName: string) =>
      ipcRenderer.invoke("cvs:setForJob", jobId, data, fileName),
    cloneBaseToJob: (jobId: string) => ipcRenderer.invoke("cvs:cloneBaseToJob", jobId),
    deleteForJob: (jobId: string) => ipcRenderer.invoke("cvs:deleteForJob", jobId),
  },
  costs: {
    get: () => ipcRenderer.invoke("costs:get"),
    track: (entry: Record<string, unknown>) => ipcRenderer.invoke("costs:track", entry),
    reset: () => ipcRenderer.invoke("costs:reset"),
  },
  // AI handlers added in Phase 4
  ai: {},
  backup: {
    exportAll: () => ipcRenderer.invoke("backup:exportAll"),
    importAll: (json: string) => ipcRenderer.invoke("backup:importAll", json),
  },
  app: {
    openExternal: (url: string) => shell.openExternal(url),
    getVersion: () => ipcRenderer.invoke("app:getVersion"),
  },
};

try {
  contextBridge.exposeInMainWorld("api", api);
} catch (err) {
  console.error("Failed to expose contextBridge API:", err);
}
