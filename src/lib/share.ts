/**
 * Share utilities for copying Apple Music links to clipboard
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

  try {
    await navigator.clipboard.writeText(url);
    toast.success('Link Copied', `Copied link for "${item.attributes.name ?? 'item'}" to clipboard.`);
  } catch {
    toast.error('Copy Failed', 'Could not copy link to clipboard.');
  }
}
