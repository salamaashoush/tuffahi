/**
 * Share utilities — native Web Share API when available, clipboard fallback.
 */

import { toast } from '../components/Toast/Toast';

export async function copyShareLink(item: {
  attributes: { url?: string; name?: string };
}): Promise<void> {
  const url = item.attributes.url;
  if (!url) {
    toast.warning('No link available', 'This item does not have a shareable link.');
    return;
  }

  const name = item.attributes.name ?? 'item';

  // Prefer the OS share sheet when present (Electron/Chromium may expose it).
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: name, text: name, url });
      return; // OS handles UI — no toast
    } catch (err) {
      // User dismissed the sheet — not an error, don't fall through to copy.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Otherwise fall back to clipboard.
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    toast.success('Link Copied', `Copied link for "${name}" to clipboard.`);
  } catch {
    toast.error('Copy Failed', 'Could not copy link to clipboard.');
  }
}
