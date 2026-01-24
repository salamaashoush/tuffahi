/**
 * Components Index
 * Export all components from a single entry point
 */

// Error Handling
export { AppErrorBoundary, SectionErrorBoundary } from './ErrorBoundary/ErrorBoundary';

// Performance
export { VirtualList, VirtualGrid } from './VirtualList/VirtualList';
export { LazyImage, ArtworkImage } from './LazyImage/LazyImage';

// Player Features
export { default as Equalizer, EqualizerVisualizer } from './Equalizer/Equalizer';
export { default as SleepTimer, SleepTimerIndicator } from './SleepTimer/SleepTimer';

// Playlist Management
export { CreatePlaylistModal, EditPlaylistModal, AddToPlaylistModal } from './Playlist/PlaylistModal';

// Browse
export { default as GenreBrowse } from './Browse/GenreBrowse';

// Song Info
export { default as SongCredits } from './SongCredits/SongCredits';

// Visual
export { default as AnimatedBackground, MiniBackground } from './AnimatedBackground/AnimatedBackground';

// Theming
export { default as ThemeCustomizer } from './ThemeCustomizer/ThemeCustomizer';

// Accessibility
export {
  SkipToContent,
  LiveRegion,
  FocusTrap,
  VisuallyHidden,
  IconButton,
  AccessibleProgress,
  KeyboardHint,
  announce,
  useRovingTabIndex,
  usePrefersReducedMotion,
} from './Accessibility/Accessibility';

// Notifications
export { ToastContainer, showToast, removeToast, clearToasts, toast } from './Toast/Toast';
