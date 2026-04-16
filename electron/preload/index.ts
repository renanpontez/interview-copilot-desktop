import { contextBridge } from "electron";

// Phase 2 will fill this in with the full DesktopAPI.
// For now, expose a version getter so the renderer can confirm the bridge works.
const api = {
  hello: () => "preload bridge ok",
};

try {
  contextBridge.exposeInMainWorld("api", api);
} catch (err) {
  console.error("Failed to expose contextBridge API:", err);
}

export type PreloadApi = typeof api;
