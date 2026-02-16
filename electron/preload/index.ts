import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  // Token
  getDeveloperToken: () => ipcRenderer.invoke('get-developer-token'),
  refreshDeveloperToken: () => ipcRenderer.invoke('refresh-developer-token'),
  isMusicKitConfigured: () => ipcRenderer.invoke('is-musickit-configured'),

  // Auth
  openAuthWindow: (authUrl: string) => ipcRenderer.invoke('open-auth-window', authUrl),

  // Windows
  openMiniPlayer: () => ipcRenderer.invoke('open-mini-player'),
  closeMiniPlayer: () => ipcRenderer.invoke('close-mini-player'),
  hideMainWindow: () => ipcRenderer.invoke('hide-main-window'),
  showMainWindow: () => ipcRenderer.invoke('show-main-window'),

  // Settings
  setCloseBehavior: (miniPlayer: boolean) => ipcRenderer.invoke('set-close-behavior', miniPlayer),
  setOpenAtLogin: (value: boolean) => ipcRenderer.invoke('set-open-at-login', value),
  getOpenAtLogin: () => ipcRenderer.invoke('get-open-at-login') as Promise<boolean>,

  // Discord
  discordConnect: () => ipcRenderer.invoke('discord-connect'),
  discordDisconnect: () => ipcRenderer.invoke('discord-disconnect'),
  discordSetActivity: (params: {
    details: string;
    state: string;
    largeImageKey: string;
    largeImageText: string;
    smallImageKey?: string;
    smallImageText?: string;
    startTimestamp?: number;
    endTimestamp?: number;
  }) => ipcRenderer.invoke('discord-set-activity', params),
  discordClearActivity: () => ipcRenderer.invoke('discord-clear-activity'),

  // Global Shortcuts
  registerShortcut: (accelerator: string) => ipcRenderer.invoke('register-shortcut', accelerator),
  unregisterShortcut: (accelerator: string) => ipcRenderer.invoke('unregister-shortcut', accelerator),
  unregisterAllShortcuts: () => ipcRenderer.invoke('unregister-all-shortcuts'),

  // Mini Player mode events
  onEnterMiniPlayer: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('enter-mini-player', handler);
    return () => ipcRenderer.removeListener('enter-mini-player', handler);
  },
  onExitMiniPlayer: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('exit-mini-player', handler);
    return () => ipcRenderer.removeListener('exit-mini-player', handler);
  },

  // Events (main → renderer)
  onAppleMusicToken: (callback: (token: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, token: string) => callback(token);
    ipcRenderer.on('apple-music-token', handler);
    return () => ipcRenderer.removeListener('apple-music-token', handler);
  },
  onTrayPlayPause: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('tray-play-pause', handler);
    return () => ipcRenderer.removeListener('tray-play-pause', handler);
  },
  onTrayNext: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('tray-next', handler);
    return () => ipcRenderer.removeListener('tray-next', handler);
  },
  onTrayPrevious: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('tray-previous', handler);
    return () => ipcRenderer.removeListener('tray-previous', handler);
  },
  onGlobalShortcutTriggered: (callback: (accelerator: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, accelerator: string) => callback(accelerator);
    ipcRenderer.on('global-shortcut-triggered', handler);
    return () => ipcRenderer.removeListener('global-shortcut-triggered', handler);
  },
});
