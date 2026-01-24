/**
 * Services Index
 * Export all services from a single entry point
 */

export { api, searchAPI, catalogAPI, libraryAPI, personalizedAPI, lyricsAPI, radioAPI, playlistAPI, APIError } from './api';
export { cacheService } from './cache';
export { logger } from './logger';
export { storageService } from './storage';
export { discordService } from './discord';
export { keyboardService, setupDefaultShortcuts } from './keyboard';
export { themeService, ThemeService } from './themes';
export type { Theme, ThemeColors } from './themes';
export type { KeyboardShortcut } from './keyboard';
