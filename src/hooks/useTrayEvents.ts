import { onMount, onCleanup } from 'solid-js';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { playerStore } from '../stores/player';

/**
 * Hook to handle system tray events from Tauri
 */
export function useTrayEvents() {
  let unlistenPlayPause: UnlistenFn | undefined;
  let unlistenNext: UnlistenFn | undefined;
  let unlistenPrevious: UnlistenFn | undefined;

  onMount(async () => {
    // Listen for play/pause from tray
    unlistenPlayPause = await listen('tray-play-pause', () => {
      playerStore.togglePlayPause();
    });

    // Listen for next track from tray
    unlistenNext = await listen('tray-next', () => {
      playerStore.skipNext();
    });

    // Listen for previous track from tray
    unlistenPrevious = await listen('tray-previous', () => {
      playerStore.skipPrevious();
    });
  });

  onCleanup(() => {
    unlistenPlayPause?.();
    unlistenNext?.();
    unlistenPrevious?.();
  });
}
