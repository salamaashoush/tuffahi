import { ipcMain, globalShortcut, BrowserWindow, app } from 'electron';
import { getDeveloperToken, refreshDeveloperToken, isMusicKitConfigured } from './token';
import { openAuthWindow } from './auth-window';
import { discordConnect, discordDisconnect, discordSetActivity, discordClearActivity } from './discord';

// Close behavior flag: when true, closing main window opens mini player
let miniPlayerOnClose = false;
let isMiniPlayerMode = false;
let savedBounds: Electron.Rectangle | null = null;

export function getMiniPlayerOnClose(): boolean {
  return miniPlayerOnClose;
}

export function getIsMiniPlayerMode(): boolean {
  return isMiniPlayerMode;
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
    if (isMiniPlayerMode) return;

    // Save current bounds
    savedBounds = mainWindow.getBounds();
    isMiniPlayerMode = true;

    // Resize to mini player dimensions
    mainWindow.setMinimumSize(280, 340);
    mainWindow.setSize(280, 340);
    mainWindow.setResizable(false);
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setSkipTaskbar(true);

    // Tell renderer to switch to mini player route
    mainWindow.webContents.send('enter-mini-player');
    mainWindow.show();
    mainWindow.focus();
  });

  ipcMain.handle('close-mini-player', () => {
    const mainWindow = getMainWindow();
    if (!mainWindow || !isMiniPlayerMode) return;

    isMiniPlayerMode = false;

    // Restore window properties
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setSkipTaskbar(false);
    mainWindow.setResizable(true);
    mainWindow.setMinimumSize(800, 600);

    // Restore saved bounds
    if (savedBounds) {
      mainWindow.setBounds(savedBounds);
      savedBounds = null;
    } else {
      mainWindow.setSize(1280, 800);
      mainWindow.center();
    }

    // Tell renderer to switch back to main view
    mainWindow.webContents.send('exit-mini-player');
    mainWindow.show();
    mainWindow.focus();
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
