import { app, BrowserWindow, globalShortcut, ipcMain } from "electron";
import path from "path";
import { startServer, stopServer } from "./server";

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

if (process.platform === "win32") {
  app.setAppUserModelId("com.mnemochat.app");
}

ipcMain.on("window:minimize", () => mainWindow?.minimize());
ipcMain.on("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on("window:close", () => mainWindow?.close());

async function createWindow() {
  const iconPath = path.join(
    __dirname,
    "assets",
    process.platform === "win32" ? "icon.ico" : "icon.png",
  );

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isDev) {
    await mainWindow.loadURL(`http://localhost:5173`);
    globalShortcut.register("F12", () => {
      mainWindow?.webContents.toggleDevTools();
    });
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  const port = await startServer();
  process.env.MNEMOCHAT_API_PORT = String(port);
  await createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  await stopServer();
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});
