/**
 * Logger Service
 * Structured logging with levels, categories, and persistence
 */

import type { LogEntry, LogLevel } from '../types';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '#9CA3AF',
  info: '#3B82F6',
  warn: '#F59E0B',
  error: '#EF4444',
};

const MAX_LOGS = 1000;
const PERSIST_KEY = 'app-logs';

class Logger {
  private logs: LogEntry[] = [];
  private minLevel: LogLevel = 'debug';
  private persistLogs: boolean = false;
  private subscribers: Set<(entry: LogEntry) => void> = new Set();

  constructor() {
    // Load persisted logs
    this.loadPersistedLogs();

    // Set log level based on environment
    if (import.meta.env.PROD) {
      this.minLevel = 'info';
    }
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  setPersist(persist: boolean): void {
    this.persistLogs = persist;
  }

  subscribe(callback: (entry: LogEntry) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private log(level: LogLevel, category: string, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
    };

    // Add to internal log array
    this.logs.push(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }

    // Console output with styling
    const color = LOG_COLORS[level];
    const timestamp = entry.timestamp.toISOString().substring(11, 23);
    const prefix = `%c[${timestamp}] [${level.toUpperCase()}] [${category}]`;

    if (data !== undefined) {
      console.log(prefix, `color: ${color}`, message, data);
    } else {
      console.log(prefix, `color: ${color}`, message);
    }

    // Notify subscribers
    this.subscribers.forEach(callback => callback(entry));

    // Persist if enabled
    if (this.persistLogs && level !== 'debug') {
      this.persistLog(entry);
    }
  }

  debug(category: string, message: string, data?: unknown): void {
    this.log('debug', category, message, data);
  }

  info(category: string, message: string, data?: unknown): void {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: unknown): void {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: unknown): void {
    this.log('error', category, message, data);
  }

  getLogs(options?: { level?: LogLevel; category?: string; limit?: number }): LogEntry[] {
    let filtered = [...this.logs];

    if (options?.level) {
      const minLevelNum = LOG_LEVELS[options.level];
      filtered = filtered.filter(log => LOG_LEVELS[log.level] >= minLevelNum);
    }

    if (options?.category) {
      filtered = filtered.filter(log => log.category === options.category);
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  clear(): void {
    this.logs = [];
    if (this.persistLogs) {
      localStorage.removeItem(PERSIST_KEY);
    }
  }

  export(): string {
    return this.logs
      .map(log => {
        const timestamp = log.timestamp.toISOString();
        const data = log.data ? ` | ${JSON.stringify(log.data)}` : '';
        return `[${timestamp}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${data}`;
      })
      .join('\n');
  }

  private persistLog(entry: LogEntry): void {
    try {
      const stored = localStorage.getItem(PERSIST_KEY);
      const logs: LogEntry[] = stored ? JSON.parse(stored) : [];
      logs.push({
        ...entry,
        timestamp: entry.timestamp,
      });

      // Keep only recent logs
      const recentLogs = logs.slice(-100);
      localStorage.setItem(PERSIST_KEY, JSON.stringify(recentLogs));
    } catch (error) {
      console.error('Failed to persist log:', error);
    }
  }

  private loadPersistedLogs(): void {
    try {
      const stored = localStorage.getItem(PERSIST_KEY);
      if (stored) {
        const logs = JSON.parse(stored) as LogEntry[];
        this.logs = logs.map(log => ({
          ...log,
          timestamp: new Date(log.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load persisted logs:', error);
    }
  }
}

export const logger = new Logger();

// Global error handler
window.addEventListener('error', (event) => {
  logger.error('global', 'Uncaught error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('global', 'Unhandled promise rejection', {
    reason: event.reason,
  });
});
