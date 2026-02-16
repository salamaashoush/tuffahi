import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
  shell,
} from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';
import { config } from 'dotenv';
import { registerIpcHandlers, getMiniPlayerOnClose } from './ipc-handlers';
import { openAuthWindow } from './auth-window';

// Load .env before anything else
config();

// ─── Wayland support ──────────────────────────────────────────────────────────
// Enable native Wayland when available, fall back to X11 otherwise.
app.commandLine.appendSwitch('ozone-platform-hint', 'auto');

// ─── Performance flags ────────────────────────────────────────────────────────
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-accelerated-mjpeg-decode');
app.commandLine.appendSwitch('enable-accelerated-video');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('enable-oop-rasterization');

// ─── Single Instance Lock ─────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// ─── State ────────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

// ─── Dev/Prod helper ──────────────────────────────────────────────────────────
const is = {
  dev: process.env.NODE_ENV === 'development',
};

// ─── Splash Window ────────────────────────────────────────────────────────────
// Inline the splash HTML as a data URL to avoid file-path issues across
// dev/prod builds. The splash is tiny (~1KB) so this is fine.
const SPLASH_HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0a;display:flex;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,sans-serif;overflow:hidden;-webkit-user-select:none;user-select:none}
.c{display:flex;flex-direction:column;align-items:center;gap:20px;animation:fi .3s ease-out}
.i{width:72px;height:72px;border-radius:16px;background:linear-gradient(135deg,#fa2d48,#e91e63);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(250,45,72,.3)}
.i svg{width:36px;height:36px;fill:#fff}
.t{text-align:center}.h{color:#fff;font-size:20px;font-weight:700;margin-bottom:4px}.s{color:rgba(255,255,255,.35);font-size:12px}
.b{width:140px;height:2px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;margin-top:4px}
.bi{height:100%;background:#fa2d48;border-radius:2px;animation:l 1.4s ease-in-out infinite}
@keyframes l{0%{width:0%;margin-left:0}50%{width:50%;margin-left:25%}100%{width:0%;margin-left:100%}}
@keyframes fi{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
</style></head><body>
<div class="c"><div class="i"><svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></div>
<div class="t"><div class="h">Tuffahi</div><div class="s">Loading...</div></div>
<div class="b"><div class="bi"></div></div></div>
</body></html>`;

function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 320,
    height: 280,
    resizable: false,
    frame: false,
    center: true,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  splashWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(SPLASH_HTML)}`
  );

  // Show only when painted to avoid flash
  splashWindow.once('ready-to-show', () => {
    splashWindow?.show();
  });
}

// ─── Main Window ──────────────────────────────────────────────────────────────
function createMainWindow(): void {
  const preloadPath = join(__dirname, '../preload/index.mjs');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    center: true,
    show: false,
    title: 'Tuffahi',
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,                // preload needs Node APIs (contextBridge)
      webSecurity: true,
      spellcheck: false,
      backgroundThrottling: false,   // keep audio smooth when window is hidden
    },
  });

  // Handle window.open() calls from the renderer
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Apple auth URLs → open our custom auth window
    if (
      url.includes('authorize.music.apple.com') ||
      url.includes('buy.itunes.apple.com')
    ) {
      openAuthWindow(mainWindow!, url);
      return { action: 'deny' };
    }
    // Everything else → system browser
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load renderer
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Open DevTools with F12 or Ctrl+Shift+I
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (
      input.key === 'F12' ||
      (input.control && input.shift && input.key.toLowerCase() === 'i')
    ) {
      mainWindow?.webContents.toggleDevTools();
    }
  });

  // Auto-open DevTools in dev mode
  if (is.dev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Splash → main window transition
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();

    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
  });

  // Hide instead of close so MusicKit keeps playing (especially for mini player)
  mainWindow.on('close', (e) => {
    if (!(app as any).isQuitting) {
      e.preventDefault();
      if (getMiniPlayerOnClose()) {
        // Open mini player and hide main window
        mainWindow?.webContents.executeJavaScript(
          'window.electron.openMiniPlayer()'
        ).catch(() => {});
      }
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── System Tray ──────────────────────────────────────────────────────────────
function setupTray(): void {
  let icon: Electron.NativeImage;
  try {
    const iconPath = join(__dirname, '../../resources/icons/32x32.png');
    icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      icon = icon.resize({ width: 16, height: 16 });
    }
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('Tuffahi');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Play/Pause',
      click: () => mainWindow?.webContents.send('tray-play-pause'),
    },
    {
      label: 'Next',
      click: () => mainWindow?.webContents.send('tray-next'),
    },
    {
      label: 'Previous',
      click: () => mainWindow?.webContents.send('tray-previous'),
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Remove default menu bar (File/Edit/View/Window/Help)
  Menu.setApplicationMenu(null);

  registerIpcHandlers(getMainWindow);

  createSplashWindow();
  createMainWindow();
  setupTray();

  app.on('activate', () => {
    if (!mainWindow) {
      createMainWindow();
    } else {
      mainWindow.show();
    }
  });
});

// Second instance → focus existing window
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// Keep tray alive when all windows close
app.on('window-all-closed', () => {
  // Don't quit — tray stays active
});

app.on('before-quit', () => {
  (app as any).isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  tray?.destroy();
});
