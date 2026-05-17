// MusicKit JS helper functions
// Type definitions are in src/types/musickit.d.ts (global namespace)

export function formatArtworkUrl(
  artwork: MusicKit.MediaItem['attributes']['artwork'],
  size: number = 300
): string {
  if (!artwork?.url) {
    return '/placeholder-album.png';
  }
  return artwork.url.replace('{w}', String(size)).replace('{h}', String(size));
}

export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export async function waitForMusicKit(timeoutMs: number = 10000): Promise<typeof MusicKit> {
  if (window.MusicKit) {
    return window.MusicKit;
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('MusicKit failed to load within timeout'));
    }, timeoutMs);

    document.addEventListener('musickitloaded', () => {
      clearTimeout(timeout);
      resolve(window.MusicKit);
    }, { once: true });
  });
}
