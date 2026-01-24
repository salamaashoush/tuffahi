/**
 * Storage Service
 * Persistent storage with IndexedDB for app state
 */

import type { AppSettings, EqualizerBands, CustomTheme } from '../types';

const DB_NAME = 'apple-music-storage';
const DB_VERSION = 1;

const STORES = {
  SETTINGS: 'settings',
  THEMES: 'themes',
  RECENT_SEARCHES: 'recent-searches',
  PLAY_HISTORY: 'play-history',
  QUEUE_STATE: 'queue-state',
} as const;

class StorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open storage database:', request.error);
        resolve(); // Continue without IndexedDB
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        Object.values(STORES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        });
      };
    });

    return this.initPromise;
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore | null> {
    await this.init();
    if (!this.db) return null;

    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  private async dbGet<T>(storeName: string, key: string): Promise<T | null> {
    const store = await this.getStore(storeName);
    if (!store) return null;

    return new Promise((resolve) => {
      const request = store.get(key);
      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }

  private async dbSet<T>(storeName: string, key: string, value: T): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    if (!store) return;

    return new Promise((resolve) => {
      const request = store.put(value, key);
      request.onerror = () => resolve();
      request.onsuccess = () => resolve();
    });
  }

  private async dbDelete(storeName: string, key: string): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    if (!store) return;

    return new Promise((resolve) => {
      const request = store.delete(key);
      request.onerror = () => resolve();
      request.onsuccess = () => resolve();
    });
  }

  // Settings
  async getSettings(): Promise<AppSettings> {
    const stored = await this.dbGet<AppSettings>(STORES.SETTINGS, 'app-settings');
    return {
      audioQuality: 'high',
      crossfade: false,
      crossfadeDuration: 6,
      showLyrics: true,
      notifications: true,
      miniPlayerOnClose: false,
      startOnLogin: false,
      theme: 'dark',
      themeId: 'default-dark',
      equalizerPreset: 'flat',
      equalizerCustom: this.getDefaultEqualizerBands(),
      discordRichPresence: false,
      sleepTimer: { enabled: false, duration: 30, endOfTrack: false, fadeOut: true },
      keyboardShortcutsEnabled: true,
      customKeyBindings: {},
      ...stored,
    };
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    const current = await this.getSettings();
    await this.dbSet(STORES.SETTINGS, 'app-settings', { ...current, ...settings });
  }

  getDefaultEqualizerBands(): EqualizerBands {
    return {
      hz32: 0,
      hz64: 0,
      hz125: 0,
      hz250: 0,
      hz500: 0,
      hz1k: 0,
      hz2k: 0,
      hz4k: 0,
      hz8k: 0,
      hz16k: 0,
      preamp: 0,
    };
  }

  // Recent Searches
  async getRecentSearches(): Promise<string[]> {
    const stored = await this.dbGet<string[]>(STORES.RECENT_SEARCHES, 'searches');
    return stored || [];
  }

  async addRecentSearch(query: string): Promise<void> {
    const searches = await this.getRecentSearches();
    const filtered = searches.filter(s => s.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, 20);
    await this.dbSet(STORES.RECENT_SEARCHES, 'searches', updated);
  }

  async clearRecentSearches(): Promise<void> {
    await this.dbDelete(STORES.RECENT_SEARCHES, 'searches');
  }

  // Play History
  async getPlayHistory(): Promise<Array<{ id: string; type: string; playedAt: number }>> {
    const stored = await this.dbGet<Array<{ id: string; type: string; playedAt: number }>>(STORES.PLAY_HISTORY, 'history');
    return stored || [];
  }

  async addToPlayHistory(id: string, type: string): Promise<void> {
    const history = await this.getPlayHistory();
    const filtered = history.filter(h => h.id !== id);
    const updated = [{ id, type, playedAt: Date.now() }, ...filtered].slice(0, 100);
    await this.dbSet(STORES.PLAY_HISTORY, 'history', updated);
  }

  async clearPlayHistory(): Promise<void> {
    await this.dbDelete(STORES.PLAY_HISTORY, 'history');
  }

  // Queue State (for persistence across sessions)
  async getQueueState(): Promise<{
    items: Array<{ id: string; type: string }>;
    position: number;
    shuffleMode: 'off' | 'on';
    repeatMode: 'none' | 'one' | 'all';
  } | null> {
    return this.dbGet(STORES.QUEUE_STATE, 'queue');
  }

  async saveQueueState(state: {
    items: Array<{ id: string; type: string }>;
    position: number;
    shuffleMode: 'off' | 'on';
    repeatMode: 'none' | 'one' | 'all';
  }): Promise<void> {
    await this.dbSet(STORES.QUEUE_STATE, 'queue', state);
  }

  async clearQueueState(): Promise<void> {
    await this.dbDelete(STORES.QUEUE_STATE, 'queue');
  }

  // Custom Themes
  async getCustomThemes(): Promise<CustomTheme[]> {
    const stored = await this.dbGet<CustomTheme[]>(STORES.THEMES, 'custom-themes');
    return stored || [];
  }

  async saveCustomTheme(theme: CustomTheme): Promise<void> {
    const themes = await this.getCustomThemes();
    const filtered = themes.filter(t => t.name !== theme.name);
    await this.dbSet(STORES.THEMES, 'custom-themes', [...filtered, theme]);
  }

  async deleteCustomTheme(name: string): Promise<void> {
    const themes = await this.getCustomThemes();
    await this.dbSet(STORES.THEMES, 'custom-themes', themes.filter(t => t.name !== name));
  }

  // Clear all storage
  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) return;

    const storeNames = Object.values(STORES);
    const transaction = this.db.transaction(storeNames, 'readwrite');

    await Promise.all(
      storeNames.map(storeName =>
        new Promise<void>((resolve) => {
          const store = transaction.objectStore(storeName);
          const request = store.clear();
          request.onerror = () => resolve();
          request.onsuccess = () => resolve();
        })
      )
    );
  }
}

export const storageService = new StorageService();
