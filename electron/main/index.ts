import { app, BrowserWindow, ipcMain, shell } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { closeDb } from "./db/client";
import { registerProfileHandlers } from "./ipc/profile";
import { registerSettingsHandlers, getStoredApiKey } from "./ipc/settings";
import { registerJobHandlers } from "./ipc/jobs";
import { registerScenarioHandlers } from "./ipc/scenarios";
import { registerCvHandlers } from "./ipc/cvs";
import { registerCostHandlers } from "./ipc/costs";
import { registerBackupHandlers } from "./ipc/backup";
import { registerAiHandlers, setApiKeyGetter } from "./ipc/ai";
import { setupMenu } from "./menu";
import { setupAutoUpdater } from "./updater";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Interview Copilot",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#0a0a0a",
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.on("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return win;
}

app.whenReady().then(() => {
  // IPC handlers
  registerProfileHandlers();
  registerSettingsHandlers();
  registerJobHandlers();
  registerScenarioHandlers();
  registerCvHandlers();
  registerCostHandlers();
  registerBackupHandlers();
  registerAiHandlers();

  setApiKeyGetter(getStoredApiKey);

  ipcMain.handle("app:getVersion", () => app.getVersion());

  setupMenu();
  createWindow();

  // Check for updates (only in packaged builds)
  if (app.isPackaged) setupAutoUpdater();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  closeDb();
});
