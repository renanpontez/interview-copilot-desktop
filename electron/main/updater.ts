import { autoUpdater } from "electron-updater";
import { BrowserWindow, dialog } from "electron";
import log from "electron-log";

export function setupAutoUpdater() {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;

  autoUpdater.on("update-available", (info) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;

    dialog
      .showMessageBox(win, {
        type: "info",
        title: "Update Available",
        message: `Version ${info.version} is available. Download now?`,
        buttons: ["Download", "Later"],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.downloadUpdate();
      });
  });

  autoUpdater.on("update-downloaded", () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;

    dialog
      .showMessageBox(win, {
        type: "info",
        title: "Update Ready",
        message: "Update downloaded. Restart to install?",
        buttons: ["Restart", "Later"],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall();
      });
  });

  // Check on startup (silently — only prompt if update found)
  autoUpdater.checkForUpdates().catch(() => {
    // Offline or no releases yet — ignore
  });
}
