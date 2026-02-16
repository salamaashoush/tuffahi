/**
 * Keyboard Shortcuts Service
 * Handles global keyboard shortcuts and media keys
 */

import { logger } from './logger';
import { storageService } from './storage';

export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  defaultKey: string;
  currentKey: string;
  action: () => void | Promise<void>;
  category: 'playback' | 'navigation' | 'app';
}

class KeyboardService {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private registeredKeys: Set<string> = new Set();
  private isEnabled = true;
  private unlistenGlobalShortcut: (() => void) | null = null;

  async init(): Promise<void> {
    try {
      const settings = await storageService.getSettings();
      this.isEnabled = settings.keyboardShortcutsEnabled !== false;

      // Load custom key bindings
      const customBindings = await this.loadCustomBindings();

      // Apply custom bindings to shortcuts
      for (const [id, key] of Object.entries(customBindings)) {
        const shortcut = this.shortcuts.get(id);
        if (shortcut) {
          shortcut.currentKey = key;
        }
      }

      // Listen for global shortcut events from main process
      this.unlistenGlobalShortcut = window.electron.onGlobalShortcutTriggered((accelerator: string) => {
        // Find the shortcut with this key and execute its action
        for (const shortcut of this.shortcuts.values()) {
          if (shortcut.currentKey === accelerator) {
            try {
              shortcut.action();
              logger.debug('keyboard', 'Shortcut executed', { id: shortcut.id });
            } catch (error) {
              logger.error('keyboard', 'Shortcut action failed', { id: shortcut.id, error });
            }
            break;
          }
        }
      });

      if (this.isEnabled) {
        await this.registerAll();
      }

      logger.info('keyboard', 'Keyboard service initialized');
    } catch (error) {
      logger.error('keyboard', 'Failed to initialize keyboard service', { error });
    }
  }

  registerShortcut(shortcut: Omit<KeyboardShortcut, 'currentKey'>): void {
    const fullShortcut: KeyboardShortcut = {
      ...shortcut,
      currentKey: shortcut.defaultKey,
    };
    this.shortcuts.set(shortcut.id, fullShortcut);
  }

  async registerAll(): Promise<void> {
    if (!this.isEnabled) return;

    for (const shortcut of this.shortcuts.values()) {
      await this.registerKey(shortcut);
    }
  }

  async unregisterAll(): Promise<void> {
    try {
      await window.electron.unregisterAllShortcuts();
      this.registeredKeys.clear();
      logger.info('keyboard', 'All shortcuts unregistered');
    } catch (error) {
      logger.error('keyboard', 'Failed to unregister shortcuts', { error });
    }
  }

  private async registerKey(shortcut: KeyboardShortcut): Promise<boolean> {
    if (this.registeredKeys.has(shortcut.currentKey)) {
      return true;
    }

    try {
      const success = await window.electron.registerShortcut(shortcut.currentKey);

      if (success) {
        this.registeredKeys.add(shortcut.currentKey);
        logger.debug('keyboard', 'Shortcut registered', { id: shortcut.id, key: shortcut.currentKey });
      }
      return success;
    } catch (error) {
      logger.warn('keyboard', 'Failed to register shortcut', { id: shortcut.id, key: shortcut.currentKey, error });
      return false;
    }
  }

  async updateShortcut(id: string, newKey: string): Promise<boolean> {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut) return false;

    // Unregister old key
    if (this.registeredKeys.has(shortcut.currentKey)) {
      try {
        await window.electron.unregisterShortcut(shortcut.currentKey);
        this.registeredKeys.delete(shortcut.currentKey);
      } catch (error) {
        logger.warn('keyboard', 'Failed to unregister old shortcut', { id, key: shortcut.currentKey });
      }
    }

    // Update and register new key
    shortcut.currentKey = newKey;
    const success = await this.registerKey(shortcut);

    if (success) {
      await this.saveCustomBindings();
    }

    return success;
  }

  async resetShortcut(id: string): Promise<boolean> {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut) return false;

    return this.updateShortcut(id, shortcut.defaultKey);
  }

  async resetAll(): Promise<void> {
    await this.unregisterAll();

    for (const shortcut of this.shortcuts.values()) {
      shortcut.currentKey = shortcut.defaultKey;
    }

    await this.registerAll();
    await this.saveCustomBindings();
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.isEnabled = enabled;
    await storageService.saveSettings({ keyboardShortcutsEnabled: enabled });

    if (enabled) {
      await this.registerAll();
    } else {
      await this.unregisterAll();
    }
  }

  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getShortcutsByCategory(category: KeyboardShortcut['category']): KeyboardShortcut[] {
    return this.getShortcuts().filter((s) => s.category === category);
  }

  isConflicting(key: string, excludeId?: string): boolean {
    for (const shortcut of this.shortcuts.values()) {
      if (shortcut.id !== excludeId && shortcut.currentKey.toLowerCase() === key.toLowerCase()) {
        return true;
      }
    }
    return false;
  }

  private async loadCustomBindings(): Promise<Record<string, string>> {
    try {
      const settings = await storageService.getSettings();
      return settings.customKeyBindings || {};
    } catch {
      return {};
    }
  }

  private async saveCustomBindings(): Promise<void> {
    const bindings: Record<string, string> = {};

    for (const shortcut of this.shortcuts.values()) {
      if (shortcut.currentKey !== shortcut.defaultKey) {
        bindings[shortcut.id] = shortcut.currentKey;
      }
    }

    await storageService.saveSettings({ customKeyBindings: bindings });
  }
}

export const keyboardService = new KeyboardService();

// Register global media key shortcuts (system-wide, work when app is in background).
// In-window keyboard shortcuts (Space, Ctrl+Arrows, Ctrl+M) are handled separately
// by useMediaKeys hook via document keydown listeners.
export function setupDefaultShortcuts(playerActions: {
  playPause: () => void;
  next: () => void;
  previous: () => void;
  toggleMiniPlayer: () => void;
}): void {
  keyboardService.registerShortcut({
    id: 'play-pause',
    name: 'Play/Pause',
    description: 'Toggle playback',
    defaultKey: 'MediaPlayPause',
    category: 'playback',
    action: playerActions.playPause,
  });

  keyboardService.registerShortcut({
    id: 'next-track',
    name: 'Next Track',
    description: 'Skip to next track',
    defaultKey: 'MediaTrackNext',
    category: 'playback',
    action: playerActions.next,
  });

  keyboardService.registerShortcut({
    id: 'previous-track',
    name: 'Previous Track',
    description: 'Go to previous track',
    defaultKey: 'MediaTrackPrevious',
    category: 'playback',
    action: playerActions.previous,
  });

  keyboardService.registerShortcut({
    id: 'media-stop',
    name: 'Stop',
    description: 'Stop playback',
    defaultKey: 'MediaStop',
    category: 'playback',
    action: playerActions.playPause,
  });

  keyboardService.registerShortcut({
    id: 'toggle-miniplayer',
    name: 'Toggle Mini Player',
    description: 'Show/hide mini player',
    defaultKey: 'CommandOrControl+Shift+M',
    category: 'app',
    action: playerActions.toggleMiniPlayer,
  });
}

export default keyboardService;
