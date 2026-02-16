/**
 * Ratings Store
 * Manages love/dislike state for tracks, albums, and playlists
 */

import { createSignal, createRoot } from 'solid-js';
import { musicKitStore } from './musickit';
import { logger } from '../services/logger';

export type RatingValue = 1 | -1 | null;
type RatingType = 'songs' | 'albums' | 'playlists';

function createRatingsStore() {
  // Map of "type:id" → rating value
  const [ratings, setRatings] = createSignal<Map<string, RatingValue>>(new Map());

  function key(type: RatingType, id: string): string {
    return `${type}:${id}`;
  }

  function getRating(type: RatingType, id: string): RatingValue {
    return ratings().get(key(type, id)) ?? null;
  }

  function isLibraryId(id: string): boolean {
    return id.startsWith('i.') || id.startsWith('l.') || id.startsWith('p.') || id.startsWith('a.');
  }

  async function fetchRating(type: RatingType, id: string): Promise<RatingValue> {
    const mk = musicKitStore.instance();
    if (!mk || !musicKitStore.isAuthorized()) return null;
    // Ratings API only works with catalog IDs, not library IDs
    if (isLibraryId(id)) return null;

    try {
      const response = await mk.api.music(`/v1/me/ratings/${type}/${id}`);
      const data = response.data as { data?: { attributes?: { value: number } }[] };
      const value = data.data?.[0]?.attributes?.value;
      const rating: RatingValue = value === 1 ? 1 : value === -1 ? -1 : null;

      setRatings((prev) => {
        const next = new Map(prev);
        next.set(key(type, id), rating);
        return next;
      });

      return rating;
    } catch {
      // 404 means no rating exists
      return null;
    }
  }

  async function setRating(type: RatingType, id: string, value: RatingValue): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk || !musicKitStore.isAuthorized()) return;
    // Ratings API only works with catalog IDs
    if (isLibraryId(id)) return;

    try {
      if (value === null) {
        // DELETE rating
        await mk.api.music(`/v1/me/ratings/${type}/${id}`, {}, {
          fetchOptions: { method: 'DELETE' },
        });
      } else {
        // PUT rating
        await mk.api.music(`/v1/me/ratings/${type}/${id}`, {}, {
          fetchOptions: {
            method: 'PUT',
            body: JSON.stringify({
              type: 'rating',
              attributes: { value },
            }),
          },
        });
      }

      setRatings((prev) => {
        const next = new Map(prev);
        if (value === null) {
          next.delete(key(type, id));
        } else {
          next.set(key(type, id), value);
        }
        return next;
      });

      logger.info('ratings', `Rating set: ${type}/${id} = ${value}`);
    } catch (err) {
      logger.error('ratings', 'Failed to set rating', { type, id, value, err });
    }
  }

  async function toggleLove(type: RatingType, id: string): Promise<void> {
    const current = getRating(type, id);
    if (current === 1) {
      await setRating(type, id, null);
    } else {
      await setRating(type, id, 1);
    }
  }

  async function toggleDislike(type: RatingType, id: string): Promise<void> {
    const current = getRating(type, id);
    if (current === -1) {
      await setRating(type, id, null);
    } else {
      await setRating(type, id, -1);
    }
  }

  async function fetchBatchRatings(type: RatingType, ids: string[]): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk || !musicKitStore.isAuthorized()) return;

    // Filter out library IDs and already-fetched IDs
    const catalogIds = ids.filter(id => !isLibraryId(id) && !ratings().has(key(type, id)));
    if (catalogIds.length === 0) return;

    // Chunk to 100 max per request
    const chunks: string[][] = [];
    for (let i = 0; i < catalogIds.length; i += 100) {
      chunks.push(catalogIds.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      try {
        const response = await mk.api.music(`/v1/me/ratings/${type}`, {
          ids: chunk.join(','),
        });
        const data = response.data as { data?: { id: string; attributes?: { value: number } }[] };
        if (data.data) {
          setRatings((prev) => {
            const next = new Map(prev);
            // Mark all requested IDs — those not in response have no rating
            for (const id of chunk) {
              const found = data.data!.find(item => item.id === id);
              if (found?.attributes?.value !== undefined) {
                const rating: RatingValue = found.attributes.value === 1 ? 1 : found.attributes.value === -1 ? -1 : null;
                next.set(key(type, id), rating);
              }
            }
            return next;
          });
        }
      } catch {
        // Ignore — ratings are optional
      }
    }
  }

  return {
    ratings,
    getRating,
    fetchRating,
    fetchBatchRatings,
    setRating,
    toggleLove,
    toggleDislike,
  };
}

export const ratingsStore = createRoot(createRatingsStore);
