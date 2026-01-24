/**
 * Common application types
 */

// Re-export MusicKit types
export type { MusicKit } from './musickit.d';

// App Settings
export interface AppSettings {
  audioQuality: AudioQuality;
  crossfade: boolean;
  crossfadeDuration: number;
  showLyrics: boolean;
  notifications: boolean;
  miniPlayerOnClose: boolean;
  startOnLogin: boolean;
  theme: ThemeMode;
  themeId: string;
  equalizerPreset: EqualizerPreset;
  equalizerCustom: EqualizerBands;
  discordRichPresence: boolean;
  sleepTimer: SleepTimerSettings;
  keyboardShortcutsEnabled: boolean;
  customKeyBindings: Record<string, string>;
}

export type AudioQuality = 'high' | 'lossless' | 'dolby';
export type ThemeMode = 'dark' | 'light' | 'system' | 'custom';

// Equalizer
export type EqualizerPreset =
  | 'flat'
  | 'acoustic'
  | 'bass-boost'
  | 'bass-reducer'
  | 'classical'
  | 'dance'
  | 'deep'
  | 'electronic'
  | 'hip-hop'
  | 'jazz'
  | 'latin'
  | 'loudness'
  | 'lounge'
  | 'piano'
  | 'pop'
  | 'r&b'
  | 'rock'
  | 'small-speakers'
  | 'spoken-word'
  | 'treble-boost'
  | 'treble-reducer'
  | 'vocal-boost'
  | 'custom';

export interface EqualizerBands {
  hz32: number;    // -12 to +12 dB
  hz64: number;
  hz125: number;
  hz250: number;
  hz500: number;
  hz1k: number;
  hz2k: number;
  hz4k: number;
  hz8k: number;
  hz16k: number;
  preamp: number;
}

// Sleep Timer
export interface SleepTimerSettings {
  enabled: boolean;
  duration: number; // minutes
  endOfTrack: boolean; // stop at end of current track
  fadeOut: boolean;
}

// Player State
export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  nowPlaying: MusicKit.MediaItem | null;
  queue: MusicKit.MediaItem[];
  queuePosition: number;
  shuffleMode: ShuffleMode;
  repeatMode: RepeatMode;
  isBuffering: boolean;
  bufferedProgress: number;
}

export type RepeatMode = 'none' | 'one' | 'all';
export type ShuffleMode = 'off' | 'on';

// Library State
export interface LibraryState {
  songs: MusicKit.LibrarySong[];
  albums: MusicKit.LibraryAlbum[];
  artists: MusicKit.Artist[];
  playlists: MusicKit.LibraryPlaylist[];
  recentlyAdded: MusicKit.MediaItem[];
  isLoading: boolean;
  error: string | null;
}

// Search State
export interface SearchState {
  query: string;
  results: MusicKit.SearchResults | null;
  isSearching: boolean;
  recentSearches: string[];
  error: string | null;
}

// Navigation
export interface NavigationItem {
  path: string;
  label: string;
  icon: string;
}

// Context Menu
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  divider?: boolean;
  submenu?: ContextMenuItem[];
  action?: () => void;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

// Toast/Notification
export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Modal
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: any;
}

// API Response wrapper
export interface APIResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

// Pagination
export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  next?: string;
  total?: number;
  hasMore: boolean;
}

// Credits
export interface SongCredits {
  songId: string;
  writers: CreditPerson[];
  producers: CreditPerson[];
  engineers: CreditPerson[];
  performers: CreditPerson[];
  label?: string;
  copyright?: string;
  releaseDate?: string;
  isrc?: string;
}

export interface CreditPerson {
  name: string;
  role: string;
}

// Theme
export interface CustomTheme {
  name: string;
  colors: ThemeColors;
}

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
}

// Discord Rich Presence
export interface DiscordPresence {
  details: string;
  state: string;
  largeImageKey: string;
  largeImageText: string;
  smallImageKey?: string;
  smallImageText?: string;
  startTimestamp?: number;
  endTimestamp?: number;
}

// Keyboard Shortcuts
export interface KeyboardShortcut {
  id: string;
  label: string;
  keys: string[];
  action: () => void;
  global?: boolean;
}

// Cache Entry
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Log Entry
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
