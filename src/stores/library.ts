import { createSignal, createRoot } from 'solid-js';
import { musicKitStore } from './musickit';

export interface LibraryState {
  songs: MusicKit.LibrarySong[];
  albums: MusicKit.LibraryAlbum[];
  artists: MusicKit.MediaItem[];
  playlists: MusicKit.LibraryPlaylist[];
  recentlyAdded: MusicKit.MediaItem[];
  isLoading: boolean;
  error: string | null;
}

export interface LibraryStore {
  state: () => LibraryState;
  fetchSongs: (limit?: number) => Promise<void>;
  fetchAlbums: (limit?: number) => Promise<void>;
  fetchArtists: (limit?: number) => Promise<void>;
  fetchPlaylists: (limit?: number) => Promise<void>;
  fetchRecentlyAdded: (limit?: number) => Promise<void>;
  fetchAll: () => Promise<void>;
}

function createLibraryStore(): LibraryStore {
  const [state, setState] = createSignal<LibraryState>({
    songs: [],
    albums: [],
    artists: [],
    playlists: [],
    recentlyAdded: [],
    isLoading: false,
    error: null,
  });

  async function fetchSongs(limit: number = 100): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk || !musicKitStore.isAuthorized()) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await mk.api.music('/v1/me/library/songs', { limit });
      const data = (response.data as { data: MusicKit.LibrarySong[] }).data || [];
      setState((prev) => ({ ...prev, songs: data, isLoading: false }));
    } catch (err) {
      console.error('[Library] fetchSongs failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch songs';
      setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
    }
  }

  async function fetchAlbums(limit: number = 100): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk || !musicKitStore.isAuthorized()) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await mk.api.music('/v1/me/library/albums', { limit });
      const data = (response.data as { data: MusicKit.LibraryAlbum[] }).data || [];
      setState((prev) => ({ ...prev, albums: data, isLoading: false }));
    } catch (err) {
      console.error('[Library] fetchAlbums failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch albums';
      setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
    }
  }

  async function fetchArtists(limit: number = 100): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk || !musicKitStore.isAuthorized()) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await mk.api.music('/v1/me/library/artists', { limit, include: 'catalog' });
      const data = (response.data as { data: MusicKit.MediaItem[] }).data || [];
      setState((prev) => ({ ...prev, artists: data, isLoading: false }));
    } catch (err) {
      console.error('[Library] fetchArtists failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch artists';
      setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
    }
  }

  async function fetchPlaylists(limit: number = 100): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk || !musicKitStore.isAuthorized()) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await mk.api.music('/v1/me/library/playlists', { limit });
      const data = (response.data as { data: MusicKit.LibraryPlaylist[] }).data || [];
      setState((prev) => ({ ...prev, playlists: data, isLoading: false }));
    } catch (err) {
      console.error('[Library] fetchPlaylists failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch playlists';
      setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
    }
  }

  async function fetchRecentlyAdded(limit: number = 25): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk || !musicKitStore.isAuthorized()) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await mk.api.music('/v1/me/library/recently-added', { limit });
      const data = (response.data as { data: MusicKit.MediaItem[] }).data || [];
      setState((prev) => ({ ...prev, recentlyAdded: data, isLoading: false }));
    } catch (err) {
      console.error('[Library] fetchRecentlyAdded failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch recently added';
      setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
    }
  }

  async function fetchAll(): Promise<void> {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    await Promise.all([fetchSongs(), fetchAlbums(), fetchArtists(), fetchPlaylists(), fetchRecentlyAdded()]);
    setState((prev) => ({ ...prev, isLoading: false }));
  }

  return {
    state,
    fetchSongs,
    fetchAlbums,
    fetchArtists,
    fetchPlaylists,
    fetchRecentlyAdded,
    fetchAll,
  };
}

export const libraryStore = createRoot(createLibraryStore);
