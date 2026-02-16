/**
 * MusicKit API Service
 * Centralized API calls with error handling, caching, and retry logic
 */

import { musicKitStore } from '../stores/musickit';
import { logger } from './logger';
import { cacheService } from './cache';
import type { PaginatedResponse, PaginationParams, SongCredits } from '../types';

// Cache durations in milliseconds
const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000,      // 5 minutes
  MEDIUM: 30 * 60 * 1000,    // 30 minutes
  LONG: 60 * 60 * 1000,      // 1 hour
  DAY: 24 * 60 * 60 * 1000,  // 24 hours
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = RETRY_CONFIG.maxRetries
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry client errors (4xx) — they won't succeed on retry
      const status = (error as any)?.status ?? (error as any)?.errorCode;
      if (status && status >= 400 && status < 500) {
        throw lastError;
      }

      if (attempt < retries) {
        const delay = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
          RETRY_CONFIG.maxDelay
        );
        logger.warn('api', `Retry attempt ${attempt + 1}/${retries} after ${delay}ms`, { error });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

async function fetchWithCache<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  duration: number = CACHE_DURATION.MEDIUM
): Promise<T> {
  // Try cache first
  const cached = await cacheService.get<T>(cacheKey);
  if (cached) {
    logger.debug('api', `Cache hit: ${cacheKey}`);
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Store in cache
  await cacheService.set(cacheKey, data, duration);

  return data;
}

// Search API
export const searchAPI = {
  async search(
    term: string,
    types: string[] = ['songs', 'albums', 'artists', 'playlists'],
    limit: number = 25
  ): Promise<MusicKit.SearchResults> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    logger.info('api', 'Searching', { term, types, limit });

    const cacheKey = `search:${term}:${types.join(',')}:${limit}`;

    return fetchWithCache(
      cacheKey,
      async () => {
        const response = await withRetry(() =>
          mk.api.music<{ results: MusicKit.SearchResults }>('/v1/catalog/{{storefrontId}}/search', {
            term,
            types: types.join(','),
            limit,
          })
        );
        return response.data.results;
      },
      CACHE_DURATION.SHORT
    );
  },

  async searchHints(term: string): Promise<string[]> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    try {
      const response = await mk.api.music('/v1/catalog/{{storefrontId}}/search/hints', {
        term,
      });
      return (response.data as { results?: { terms?: string[] } }).results?.terms || [];
    } catch (error) {
      logger.warn('api', 'Search hints failed', { error });
      return [];
    }
  },
};

// Catalog API
export const catalogAPI = {
  async getAlbum(id: string, include?: string[]): Promise<MusicKit.Album> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    const cacheKey = `album:${id}`;

    return fetchWithCache(
      cacheKey,
      async () => {
        const response = await withRetry(() =>
          mk.api.music(`/v1/catalog/{{storefrontId}}/albums/${id}`, {
            include: include?.join(','),
          })
        );
        return (response.data as { data: MusicKit.Album[] }).data[0];
      },
      CACHE_DURATION.LONG
    );
  },

  async getArtist(id: string, include?: string[]): Promise<MusicKit.Artist> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    const cacheKey = `artist:${id}`;

    return fetchWithCache(
      cacheKey,
      async () => {
        const response = await withRetry(() =>
          mk.api.music(`/v1/catalog/{{storefrontId}}/artists/${id}`, {
            include: include?.join(','),
          })
        );
        return (response.data as { data: MusicKit.Artist[] }).data[0];
      },
      CACHE_DURATION.LONG
    );
  },

  async getPlaylist(id: string, include?: string[]): Promise<MusicKit.Playlist> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    const cacheKey = `playlist:${id}`;

    return fetchWithCache(
      cacheKey,
      async () => {
        const response = await withRetry(() =>
          mk.api.music(`/v1/catalog/{{storefrontId}}/playlists/${id}`, {
            include: include?.join(','),
          })
        );
        return (response.data as { data: MusicKit.Playlist[] }).data[0];
      },
      CACHE_DURATION.MEDIUM
    );
  },

  async getSong(id: string): Promise<MusicKit.Song> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    const response = await withRetry(() =>
      mk.api.music(`/v1/catalog/{{storefrontId}}/songs/${id}`)
    );
    return (response.data as { data: MusicKit.Song[] }).data[0];
  },

  async getSongs(ids: string[]): Promise<MusicKit.Song[]> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    if (ids.length === 0) return [];

    const response = await withRetry(() =>
      mk.api.music(`/v1/catalog/{{storefrontId}}/songs`, {
        ids: ids.join(','),
      })
    );
    return (response.data as { data: MusicKit.Song[] }).data;
  },

  async getStation(id: string): Promise<MusicKit.Station> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    const response = await withRetry(() =>
      mk.api.music(`/v1/catalog/{{storefrontId}}/stations/${id}`)
    );
    return (response.data as { data: MusicKit.Station[] }).data[0];
  },

  async getCharts(types: string[] = ['songs', 'albums', 'playlists'], limit: number = 20): Promise<MusicKit.ChartResults> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    const cacheKey = `charts:${types.join(',')}:${limit}`;

    return fetchWithCache(
      cacheKey,
      async () => {
        const response = await withRetry(() =>
          mk.api.music('/v1/catalog/{{storefrontId}}/charts', {
            types: types.join(','),
            limit,
          })
        );
        return (response.data as { results: MusicKit.ChartResults }).results;
      },
      CACHE_DURATION.MEDIUM
    );
  },

  async getGenres(): Promise<MusicKit.Genre[]> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    const cacheKey = 'genres';

    return fetchWithCache(
      cacheKey,
      async () => {
        const response = await withRetry(() =>
          mk.api.music('/v1/catalog/{{storefrontId}}/genres', { limit: 100 })
        );
        return (response.data as { data: MusicKit.Genre[] }).data;
      },
      CACHE_DURATION.DAY
    );
  },

  async getGenrePlaylists(genreId: string, limit: number = 25): Promise<MusicKit.Playlist[]> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    const cacheKey = `genre:${genreId}:playlists:${limit}`;

    return fetchWithCache(
      cacheKey,
      async () => {
        const response = await withRetry(() =>
          mk.api.music(`/v1/catalog/{{storefrontId}}/genres/${genreId}/playlists`, { limit })
        );
        return (response.data as { data: MusicKit.Playlist[] }).data;
      },
      CACHE_DURATION.MEDIUM
    );
  },

  async getActivities(): Promise<MusicKit.Activity[]> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    const cacheKey = 'activities';

    return fetchWithCache(
      cacheKey,
      async () => {
        const response = await withRetry(() =>
          mk.api.music('/v1/catalog/{{storefrontId}}/activities', { limit: 100 })
        );
        return (response.data as { data: MusicKit.Activity[] }).data;
      },
      CACHE_DURATION.DAY
    );
  },

  async getActivityPlaylists(activityId: string): Promise<MusicKit.Playlist[]> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    const cacheKey = `activity:${activityId}:playlists`;

    return fetchWithCache(
      cacheKey,
      async () => {
        const response = await withRetry(() =>
          mk.api.music(`/v1/catalog/{{storefrontId}}/activities/${activityId}`, {
            include: 'playlists',
          })
        );
        const activity = (response.data as { data: MusicKit.Activity[] }).data[0];
        return activity.relationships?.playlists?.data || [];
      },
      CACHE_DURATION.MEDIUM
    );
  },
};

// Library API
export const libraryAPI = {
  async getSongs(params: PaginationParams = { limit: 100, offset: 0 }): Promise<PaginatedResponse<MusicKit.LibrarySong>> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    const response = await withRetry(() =>
      mk.api.music('/v1/me/library/songs', params)
    );

    const data = response.data as { data: MusicKit.LibrarySong[]; next?: string };
    return {
      data: data.data,
      next: data.next,
      hasMore: !!data.next,
    };
  },

  async getAlbums(params: PaginationParams = { limit: 100, offset: 0 }): Promise<PaginatedResponse<MusicKit.LibraryAlbum>> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    const response = await withRetry(() =>
      mk.api.music('/v1/me/library/albums', params)
    );

    const data = response.data as { data: MusicKit.LibraryAlbum[]; next?: string };
    return {
      data: data.data,
      next: data.next,
      hasMore: !!data.next,
    };
  },

  async getPlaylists(params: PaginationParams = { limit: 100, offset: 0 }): Promise<PaginatedResponse<MusicKit.LibraryPlaylist>> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    const response = await withRetry(() =>
      mk.api.music('/v1/me/library/playlists', params)
    );

    const data = response.data as { data: MusicKit.LibraryPlaylist[]; next?: string };
    return {
      data: data.data,
      next: data.next,
      hasMore: !!data.next,
    };
  },

  async getRecentlyAdded(limit: number = 25): Promise<MusicKit.MediaItem[]> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    const response = await withRetry(() =>
      mk.api.music('/v1/me/library/recently-added', { limit })
    );

    return (response.data as { data: MusicKit.MediaItem[] }).data;
  },

  async addToLibrary(type: 'songs' | 'albums' | 'playlists', ids: string[]): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    logger.info('api', 'Adding to library', { type, ids });

    await withRetry(() =>
      mk.api.music('/v1/me/library', {}, {
        fetchOptions: {
          method: 'POST',
          body: JSON.stringify({
            data: ids.map(id => ({ id, type })),
          }),
        },
      })
    );

    // Invalidate library cache
    await cacheService.delete(`library:${type}`);
  },

  async removeFromLibrary(type: 'songs' | 'albums' | 'playlists', ids: string[]): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    logger.info('api', 'Removing from library', { type, ids });

    for (const id of ids) {
      await withRetry(() =>
        mk.api.music(`/v1/me/library/${type}/${id}`, {}, {
          fetchOptions: { method: 'DELETE' },
        })
      );
    }

    // Invalidate library cache
    await cacheService.delete(`library:${type}`);
  },

  // Playlist management
  async createPlaylist(name: string, description?: string, tracks?: string[]): Promise<MusicKit.LibraryPlaylist> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    logger.info('api', 'Creating playlist', { name });

    const body: Record<string, unknown> = {
      attributes: {
        name,
        description: description || '',
      },
    };

    if (tracks && tracks.length > 0) {
      body.relationships = {
        tracks: {
          data: tracks.map(id => ({ id, type: 'songs' })),
        },
      };
    }

    const response = await withRetry(() =>
      mk.api.music('/v1/me/library/playlists', {}, {
        fetchOptions: {
          method: 'POST',
          body: JSON.stringify(body),
        },
      })
    );

    // Invalidate playlists cache
    await cacheService.delete('library:playlists');

    return (response.data as { data: MusicKit.LibraryPlaylist[] }).data[0];
  },

  async deletePlaylist(id: string): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    logger.info('api', 'Deleting playlist', { id });

    await withRetry(() =>
      mk.api.music(`/v1/me/library/playlists/${id}`, {}, {
        fetchOptions: { method: 'DELETE' },
      })
    );

    // Invalidate playlists cache
    await cacheService.delete('library:playlists');
    await cacheService.delete(`playlist:${id}`);
  },

  async addToPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    logger.info('api', 'Adding to playlist', { playlistId, trackIds });

    await withRetry(() =>
      mk.api.music(`/v1/me/library/playlists/${playlistId}/tracks`, {}, {
        fetchOptions: {
          method: 'POST',
          body: JSON.stringify({
            data: trackIds.map(id => ({ id, type: 'songs' })),
          }),
        },
      })
    );

    // Invalidate playlist cache
    await cacheService.delete(`playlist:${playlistId}`);
  },

  async removeFromPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    logger.info('api', 'Removing from playlist', { playlistId, trackIds });

    for (const trackId of trackIds) {
      await withRetry(() =>
        mk.api.music(`/v1/me/library/playlists/${playlistId}/tracks/${trackId}`, {}, {
          fetchOptions: { method: 'DELETE' },
        })
      );
    }

    // Invalidate playlist cache
    await cacheService.delete(`playlist:${playlistId}`);
  },

  async renamePlaylist(playlistId: string, name: string, description?: string): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    logger.info('api', 'Renaming playlist', { playlistId, name });

    await withRetry(() =>
      mk.api.music(`/v1/me/library/playlists/${playlistId}`, {}, {
        fetchOptions: {
          method: 'PATCH',
          body: JSON.stringify({
            attributes: {
              name,
              ...(description !== undefined && { description }),
            },
          }),
        },
      })
    );

    // Invalidate caches
    await cacheService.delete('library:playlists');
    await cacheService.delete(`playlist:${playlistId}`);
  },
};

// Personalized content API
export const personalizedAPI = {
  async getRecommendations(): Promise<MusicKit.Recommendation[]> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    const cacheKey = 'recommendations';

    return fetchWithCache(
      cacheKey,
      async () => {
        const response = await withRetry(() =>
          mk.api.music('/v1/me/recommendations', { limit: 10 })
        );
        return (response.data as { data: MusicKit.Recommendation[] }).data;
      },
      CACHE_DURATION.MEDIUM
    );
  },

  async getHeavyRotation(): Promise<MusicKit.MediaItem[]> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    const cacheKey = 'heavy-rotation';

    return fetchWithCache(
      cacheKey,
      async () => {
        const response = await withRetry(() =>
          mk.api.music('/v1/me/history/heavy-rotation', { limit: 10 })
        );
        return (response.data as { data: MusicKit.MediaItem[] }).data;
      },
      CACHE_DURATION.SHORT
    );
  },

  async getRecentlyPlayed(): Promise<MusicKit.MediaItem[]> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    const response = await withRetry(() =>
      mk.api.music('/v1/me/recent/played', { limit: 10 })
    );
    return (response.data as { data: MusicKit.MediaItem[] }).data;
  },
};

// Radio API
export const radioAPI = {
  async getStations(ids: string[]): Promise<MusicKit.Station[]> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');
    if (ids.length === 0) return [];

    const cacheKey = `radio:stations:${ids.join(',')}`;

    return fetchWithCache(
      cacheKey,
      async () => {
        const response = await withRetry(() =>
          mk.api.music('/v1/catalog/{{storefrontId}}/stations', {
            ids: ids.join(','),
          })
        );
        return (response.data as { data: MusicKit.Station[] }).data;
      },
      CACHE_DURATION.LONG
    );
  },

  async getLiveStations(): Promise<MusicKit.Station[]> {
    // Known Apple Music live radio station IDs
    const liveIds = ['ra.978484891', 'ra.1498157166', 'ra.1498157150'];
    return this.getStations(liveIds);
  },
};

// Playlist API - wraps library methods with result types for UI components
export const playlistAPI = {
  async createPlaylist(
    name: string,
    description?: string
  ): Promise<{ data: MusicKit.LibraryPlaylist | null; error?: string }> {
    try {
      const playlist = await libraryAPI.createPlaylist(name, description);
      return { data: playlist };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('api', 'Failed to create playlist', { name, error });
      return { data: null, error: message };
    }
  },

  async deletePlaylist(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      await libraryAPI.deletePlaylist(id);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('api', 'Failed to delete playlist', { id, error });
      return { success: false, error: message };
    }
  },

  async addToPlaylist(
    playlistId: string,
    trackIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await libraryAPI.addToPlaylist(playlistId, trackIds);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('api', 'Failed to add to playlist', { playlistId, trackIds, error });
      return { success: false, error: message };
    }
  },

  async removeFromPlaylist(
    playlistId: string,
    trackIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await libraryAPI.removeFromPlaylist(playlistId, trackIds);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('api', 'Failed to remove from playlist', { playlistId, trackIds, error });
      return { success: false, error: message };
    }
  },

  async renamePlaylist(
    playlistId: string,
    name: string
  ): Promise<{ data: MusicKit.LibraryPlaylist | null; error?: string }> {
    try {
      await libraryAPI.renamePlaylist(playlistId, name);
      // Return a mock updated playlist since the API doesn't return it
      return {
        data: {
          id: playlistId,
          type: 'library-playlists',
          attributes: { name },
        } as unknown as MusicKit.LibraryPlaylist,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('api', 'Failed to rename playlist', { playlistId, name, error });
      return { data: null, error: message };
    }
  },
};

// Ratings API
// Uses /v1/me/ratings/{type} with ids query param (batch) or /v1/me/ratings/{type}/{id}
export const ratingsAPI = {
  async getRating(type: 'songs' | 'albums' | 'playlists', id: string): Promise<number | null> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    try {
      const response = await mk.api.music(`/v1/me/ratings/${type}`, {
        ids: id,
      });
      const data = response.data as { data?: { attributes?: { value: number } }[] };
      return data.data?.[0]?.attributes?.value ?? null;
    } catch {
      return null;
    }
  },

  async setRating(type: 'songs' | 'albums' | 'playlists', id: string, value: 1 | -1): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    await withRetry(() =>
      mk.api.music(`/v1/me/ratings/${type}/${id}`, {}, {
        fetchOptions: {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: [{
              type: 'rating',
              attributes: { value },
            }],
          }),
        },
      })
    );
  },

  async deleteRating(type: 'songs' | 'albums' | 'playlists', id: string): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) throw new APIError('MusicKit not initialized');

    await withRetry(() =>
      mk.api.music(`/v1/me/ratings/${type}/${id}`, {}, {
        fetchOptions: { method: 'DELETE' },
      })
    );
  },
};

// Export all APIs
export const api = {
  search: searchAPI,
  catalog: catalogAPI,
  library: libraryAPI,
  personalized: personalizedAPI,
  radio: radioAPI,
  playlist: playlistAPI,
  ratings: ratingsAPI,
};

export { APIError };
