import { createEffect } from 'solid-js';
import { playerStore } from '../stores/player';
import { formatArtworkUrl } from '../lib/musickit';

let previousTrackId: string | null = null;

// Browser Notification API (works in Electron)
export function useBrowserNotifications() {
  createEffect(async () => {
    const nowPlaying = playerStore.state().nowPlaying;

    if (!nowPlaying) {
      previousTrackId = null;
      return;
    }

    if (nowPlaying.id === previousTrackId) {
      return;
    }

    previousTrackId = nowPlaying.id;

    // Check settings
    const settings = localStorage.getItem('app-settings');
    if (settings) {
      try {
        const parsed = JSON.parse(settings);
        if (parsed.notifications === false) {
          return;
        }
      } catch {
        // Ignore
      }
    }

    // Request permission if needed
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    const { name, artistName, artwork } = nowPlaying.attributes;

    // Create notification
    const notification = new Notification(name, {
      body: artistName,
      icon: artwork ? formatArtworkUrl(artwork, 128) : undefined,
      silent: true,
    });

    // Auto-close after 4 seconds (if supported)
    if (typeof notification.close === 'function') {
      setTimeout(() => notification.close(), 4000);
    }
  });
}
