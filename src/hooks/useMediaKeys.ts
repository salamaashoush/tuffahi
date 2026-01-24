import { onMount, onCleanup } from 'solid-js';
import { playerStore } from '../stores/player';

/**
 * Hook to handle media key events
 *
 * Note: On most platforms, media keys are handled at the OS level.
 * This hook sets up listeners for the MediaSession API which some
 * platforms support in webviews.
 */
export function useMediaKeys() {
  onMount(() => {
    // Set up Media Session API if available
    if ('mediaSession' in navigator) {
      setupMediaSession();
    }

    // Listen for keyboard shortcuts as fallback
    document.addEventListener('keydown', handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });
}

function setupMediaSession() {
  const mediaSession = navigator.mediaSession;

  mediaSession.setActionHandler('play', () => {
    playerStore.play();
  });

  mediaSession.setActionHandler('pause', () => {
    playerStore.pause();
  });

  mediaSession.setActionHandler('previoustrack', () => {
    playerStore.skipPrevious();
  });

  mediaSession.setActionHandler('nexttrack', () => {
    playerStore.skipNext();
  });

  mediaSession.setActionHandler('seekto', (details) => {
    if (details.seekTime !== undefined) {
      playerStore.seekTo(details.seekTime);
    }
  });
}

function handleKeyDown(event: KeyboardEvent) {
  // Only handle if no input is focused
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement
  ) {
    return;
  }

  switch (event.code) {
    case 'Space':
      event.preventDefault();
      playerStore.togglePlayPause();
      break;

    case 'ArrowLeft':
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        playerStore.skipPrevious();
      }
      break;

    case 'ArrowRight':
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        playerStore.skipNext();
      }
      break;

    case 'ArrowUp':
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        const currentVolume = playerStore.state().volume;
        playerStore.setVolume(Math.min(1, currentVolume + 0.1));
      }
      break;

    case 'ArrowDown':
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        const currentVolume = playerStore.state().volume;
        playerStore.setVolume(Math.max(0, currentVolume - 0.1));
      }
      break;

    case 'KeyM':
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        const volume = playerStore.state().volume;
        playerStore.setVolume(volume > 0 ? 0 : 1);
      }
      break;
  }
}

/**
 * Update the Media Session metadata with current track info
 */
export function updateMediaSessionMetadata(
  title: string,
  artist: string,
  album: string,
  artworkUrl?: string
) {
  if (!('mediaSession' in navigator)) return;

  const artwork = artworkUrl
    ? [
        { src: artworkUrl, sizes: '96x96', type: 'image/png' },
        { src: artworkUrl, sizes: '128x128', type: 'image/png' },
        { src: artworkUrl, sizes: '256x256', type: 'image/png' },
        { src: artworkUrl, sizes: '512x512', type: 'image/png' },
      ]
    : [];

  navigator.mediaSession.metadata = new MediaMetadata({
    title,
    artist,
    album,
    artwork,
  });
}
