/**
 * Cache Service with IndexedDB
 * Provides persistent caching with TTL support
 */

import type { CacheEntry } from '../types';

const DB_NAME = 'apple-music-cache';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

class CacheService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();

  async init(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open cache database:', request.error);
        // Fall back to memory-only cache
        resolve();
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  async get<T>(key: string): Promise<T | null> {
    await this.init();

    // Check memory cache first
    const memEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined;
    if (memEntry) {
      if (Date.now() < memEntry.expiresAt) {
        return memEntry.data;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // Check IndexedDB
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => {
        resolve(null);
      };

      request.onsuccess = () => {
        const entry = request.result as { key: string; data: T; timestamp: number; expiresAt: number } | undefined;

        if (!entry) {
          resolve(null);
          return;
        }

        if (Date.now() < entry.expiresAt) {
          // Update memory cache
          this.memoryCache.set(key, {
            data: entry.data,
            timestamp: entry.timestamp,
            expiresAt: entry.expiresAt,
          });
          resolve(entry.data);
        } else {
          // Entry expired, delete it
          this.delete(key);
          resolve(null);
        }
      };
    });
  }

  async set<T>(key: string, data: T, ttlMs: number): Promise<void> {
    await this.init();

    const timestamp = Date.now();
    const expiresAt = timestamp + ttlMs;

    const entry: CacheEntry<T> & { key: string } = {
      key,
      data,
      timestamp,
      expiresAt,
    };

    // Update memory cache
    this.memoryCache.set(key, { data, timestamp, expiresAt });

    // Update IndexedDB
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onerror = () => {
        console.error('Failed to cache data:', request.error);
        resolve();
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async delete(key: string): Promise<void> {
    await this.init();

    // Remove from memory cache
    this.memoryCache.delete(key);

    // Remove from IndexedDB
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onerror = () => {
        resolve();
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async clear(): Promise<void> {
    await this.init();

    // Clear memory cache
    this.memoryCache.clear();

    // Clear IndexedDB
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => {
        resolve();
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async cleanup(): Promise<void> {
    await this.init();

    const now = Date.now();

    // Cleanup memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now >= entry.expiresAt) {
        this.memoryCache.delete(key);
      }
    }

    // Cleanup IndexedDB
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('expiresAt');
      const range = IDBKeyRange.upperBound(now);
      const request = index.openCursor(range);

      request.onerror = () => {
        resolve();
      };

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  async getStats(): Promise<{ count: number; sizeEstimate: number }> {
    await this.init();

    if (!this.db) {
      return { count: this.memoryCache.size, sizeEstimate: 0 };
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        resolve({
          count: countRequest.result,
          sizeEstimate: this.memoryCache.size * 1024, // Rough estimate
        });
      };

      countRequest.onerror = () => {
        resolve({ count: 0, sizeEstimate: 0 });
      };
    });
  }
}

export const cacheService = new CacheService();

// Run cleanup periodically (every 5 minutes)
setInterval(() => {
  cacheService.cleanup().catch(console.error);
}, 5 * 60 * 1000);
