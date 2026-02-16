import { ipcMain, globalShortcut, BrowserWindow, shell, app } from 'electron';
import { join } from 'path';
import { getDeveloperToken, refreshDeveloperToken, isMusicKitConfigured } from './token';
import { openAuthWindow } from './auth-window';
import { discordConnect, discordDisconnect, discordSetActivity, discordClearActivity } from './discord';

export function getMiniPlayerWindow(): BrowserWindow | null {
  return miniPlayerWindow;
}

// Close behavior flag: when true, closing main window opens mini player
let miniPlayerOnClose = false;

export function getMiniPlayerOnClose(): boolean {
  return miniPlayerOnClose;
}

export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
  // ── Token ─────────────────────────────────────────────────────────────────
  ipcMain.handle('get-developer-token', () => getDeveloperToken());
  ipcMain.handle('refresh-developer-token', () => refreshDeveloperToken());
  ipcMain.handle('is-musickit-configured', () => isMusicKitConfigured());

  // ── Auth ──────────────────────────────────────────────────────────────────
  ipcMain.handle('open-auth-window', (_event, authUrl: string) => {
    const mainWindow = getMainWindow();
    if (!mainWindow) throw new Error('Main window not found');
    openAuthWindow(mainWindow, authUrl);
  });

  // ── Window Management ─────────────────────────────────────────────────────
  ipcMain.handle('open-mini-player', () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return;
    createMiniPlayer(mainWindow);
  });

  ipcMain.handle('close-mini-player', () => {
    if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
      miniPlayerWindow.close();
    }
  });

  ipcMain.handle('hide-main-window', () => {
    getMainWindow()?.hide();
  });

  ipcMain.handle('show-main-window', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // ── Mini Player Controls (mini player → main window) ─────────────────────
  // Uses executeJavaScript to call the player command directly in the main
  // window — no event listeners to stack or duplicate on HMR.
  ipcMain.handle('mini-player-command', async (_event, command: string) => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return;
    try {
      await mainWindow.webContents.executeJavaScript(
        `window.__playerCommand && window.__playerCommand(${JSON.stringify(command)})`
      );
    } catch (err) {
      console.error('[IPC] mini-player-command executeJavaScript failed:', err);
    }
  });

  // Main window sends player state updates → forwarded to mini player
  ipcMain.on('player-state-update', (_event, state) => {
    if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
      miniPlayerWindow.webContents.send('player-state-update', state);
    }
  });

  // ── Discord ───────────────────────────────────────────────────────────────
  ipcMain.handle('discord-connect', () => discordConnect());
  ipcMain.handle('discord-disconnect', () => discordDisconnect());
  ipcMain.handle('discord-set-activity', (_event, params) => discordSetActivity(params));
  ipcMain.handle('discord-clear-activity', () => discordClearActivity());

  // ── Settings ────────────────────────────────────────────────────────────
  ipcMain.handle('set-close-behavior', (_event, miniPlayer: boolean) => {
    miniPlayerOnClose = miniPlayer;
  });

  ipcMain.handle('set-open-at-login', (_event, value: boolean) => {
    app.setLoginItemSettings({ openAtLogin: value });
  });

  ipcMain.handle('get-open-at-login', () => {
    return app.getLoginItemSettings().openAtLogin;
  });

  // ── Global Shortcuts ──────────────────────────────────────────────────────
  ipcMain.handle('register-shortcut', (_event, accelerator: string) => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return false;

    try {
      return globalShortcut.register(accelerator, () => {
        mainWindow.webContents.send('global-shortcut-triggered', accelerator);
      });
    } catch {
      return false;
    }
  });

  ipcMain.handle('unregister-shortcut', (_event, accelerator: string) => {
    try {
      globalShortcut.unregister(accelerator);
    } catch {
      // Ignore — shortcut may not be registered
    }
  });

  ipcMain.handle('unregister-all-shortcuts', () => {
    globalShortcut.unregisterAll();
  });
}

// ── Mini Player ───────────────────────────────────────────────────────────────
let miniPlayerWindow: BrowserWindow | null = null;

function createMiniPlayer(mainWindow: BrowserWindow): void {
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.show();
    miniPlayerWindow.focus();
    return;
  }

  const preloadPath = join(__dirname, '../preload/index.mjs');

  miniPlayerWindow = new BrowserWindow({
    width: 280,
    height: 340,
    resizable: false,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    title: 'Mini Player',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  // Open external links in system browser
  miniPlayerWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    miniPlayerWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/miniplayer.html`);
  } else {
    miniPlayerWindow.loadFile(join(__dirname, '../renderer/miniplayer.html'));
  }

  miniPlayerWindow.on('closed', () => {
    miniPlayerWindow = null;
  });
}
