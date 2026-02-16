interface ElectronAPI {
  // Token
  getDeveloperToken(): Promise<string>;
  refreshDeveloperToken(): Promise<string>;
  isMusicKitConfigured(): Promise<boolean>;

  // Auth
  openAuthWindow(authUrl: string): Promise<void>;

  // Windows
  openMiniPlayer(): Promise<void>;
  closeMiniPlayer(): Promise<void>;
  hideMainWindow(): Promise<void>;
  showMainWindow(): Promise<void>;

  // Settings
  setCloseBehavior(miniPlayer: boolean): Promise<void>;
  setOpenAtLogin(value: boolean): Promise<void>;
  getOpenAtLogin(): Promise<boolean>;

  // Discord
  discordConnect(): Promise<void>;
  discordDisconnect(): Promise<void>;
  discordSetActivity(params: {
    details: string;
    state: string;
    largeImageKey: string;
    largeImageText: string;
    smallImageKey?: string;
    smallImageText?: string;
    startTimestamp?: number;
    endTimestamp?: number;
  }): Promise<void>;
  discordClearActivity(): Promise<void>;

  // Global Shortcuts
  registerShortcut(accelerator: string): Promise<boolean>;
  unregisterShortcut(accelerator: string): Promise<void>;
  unregisterAllShortcuts(): Promise<void>;

  // Mini Player mode events
  onEnterMiniPlayer(callback: () => void): () => void;
  onExitMiniPlayer(callback: () => void): () => void;

  // Events (return unlisten function)
  onAppleMusicToken(callback: (token: string) => void): () => void;
  onTrayPlayPause(callback: () => void): () => void;
  onTrayNext(callback: () => void): () => void;
  onTrayPrevious(callback: () => void): () => void;
  onGlobalShortcutTriggered(callback: (accelerator: string) => void): () => void;
}

interface Window {
  electron: ElectronAPI;
}
