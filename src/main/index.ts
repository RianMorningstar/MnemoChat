import { app, BrowserWindow } from "electron";
import path from "path";
import { startServer, stopServer } from "./server";

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

async function createWindow(port: number) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    await mainWindow.loadURL(`http://localhost:5173`);
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  const port = await startServer();
  process.env.MNEMOCHAT_API_PORT = String(port);
  await createWindow(port);
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
    const port = Number(process.env.MNEMOCHAT_API_PORT) || 3001;
    await createWindow(port);
  }
});
