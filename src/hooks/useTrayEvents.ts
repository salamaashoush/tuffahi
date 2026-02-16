import { onMount, onCleanup } from 'solid-js';
import { playerStore } from '../stores/player';

/**
 * Hook to handle system tray events from Electron main process
 */
export function useTrayEvents() {
  let unlistenPlayPause: (() => void) | undefined;
  let unlistenNext: (() => void) | undefined;
  let unlistenPrevious: (() => void) | undefined;

  onMount(() => {
    // Listen for play/pause from tray
    unlistenPlayPause = window.electron.onTrayPlayPause(() => {
      playerStore.togglePlayPause();
    });

    // Listen for next track from tray
    unlistenNext = window.electron.onTrayNext(() => {
      playerStore.skipNext();
    });

    // Listen for previous track from tray
    unlistenPrevious = window.electron.onTrayPrevious(() => {
      playerStore.skipPrevious();
    });
  });

  onCleanup(() => {
    unlistenPlayPause?.();
    unlistenNext?.();
    unlistenPrevious?.();
  });
}
