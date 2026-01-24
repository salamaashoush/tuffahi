import { createEffect, onCleanup } from 'solid-js';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { playerStore } from '../stores/player';
import { formatArtworkUrl } from '../lib/musickit';

let previousTrackId: string | null = null;

export function useNotifications() {
  createEffect(async () => {
    const nowPlaying = playerStore.state().nowPlaying;

    // Check if we should show notification
    if (!nowPlaying) {
      previousTrackId = null;
      return;
    }

    // Only show notification if track changed
    if (nowPlaying.id === previousTrackId) {
      return;
    }

    previousTrackId = nowPlaying.id;

    // Check if notifications are enabled in settings
    const settings = localStorage.getItem('app-settings');
    if (settings) {
      try {
        const parsed = JSON.parse(settings);
        if (parsed.notifications === false) {
          return;
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Check permission
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }

    if (!permissionGranted) {
      return;
    }

    // Send notification
    const { name, artistName, albumName, artwork } = nowPlaying.attributes;

    try {
      await sendNotification({
        title: name,
        body: `${artistName} — ${albumName}`,
        // Note: icon path needs to be a local file path, not a URL
        // For web artwork URLs, we'd need to download the image first
      });
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  });
}

// Alternative: Browser Notification API (works in dev mode)
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

    // Auto-close after 4 seconds
    setTimeout(() => notification.close(), 4000);
  });
}
