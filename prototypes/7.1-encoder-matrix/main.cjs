// Throwaway probe for roadmap stage 7.1. Never imported by packages. Run: pnpm install && pnpm probe
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const RESULT_LIMIT_BYTES = 1_000_000;

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    show: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.on('probe:result', (_event, result) => {
  if (typeof result !== 'object' || result === null) return;
  const text = JSON.stringify(
    {
      ...result,
      host: {
        platform: process.platform,
        arch: process.arch,
        osRelease: os.release(),
        electron: process.versions.electron,
        chrome: process.versions.chrome,
      },
    },
    null,
    2,
  );
  if (text.length > RESULT_LIMIT_BYTES) return;

  const dir = path.join(__dirname, 'results');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${process.platform}-${process.arch}.json`);
  fs.writeFileSync(file, text);
  console.log(text);
  console.log(`\nSaved to ${file}`);
  if (process.argv.includes('--auto-exit')) app.quit();
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
