import { createSignal, createRoot } from 'solid-js';
import { musicKitStore } from './musickit';

export interface LibraryState {
  songs: MusicKit.LibrarySong[];
  albums: MusicKit.LibraryAlbum[];
  playlists: MusicKit.LibraryPlaylist[];
  recentlyAdded: MusicKit.LibraryResource[];
  isLoading: boolean;
  error: string | null;
}

export interface LibraryStore {
  state: () => LibraryState;
  fetchSongs: (limit?: number) => Promise<void>;
  fetchAlbums: (limit?: number) => Promise<void>;
  fetchPlaylists: (limit?: number) => Promise<void>;
  fetchRecentlyAdded: (limit?: number) => Promise<void>;
  fetchAll: () => Promise<void>;
}

function createLibraryStore(): LibraryStore {
  const [state, setState] = createSignal<LibraryState>({
    songs: [],
    albums: [],
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
      const response = await mk.api.library.songs({ limit });
      setState((prev) => ({ ...prev, songs: response.data, isLoading: false }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch songs';
      setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
    }
  }

  async function fetchAlbums(limit: number = 100): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk || !musicKitStore.isAuthorized()) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await mk.api.library.albums({ limit });
      setState((prev) => ({ ...prev, albums: response.data, isLoading: false }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch albums';
      setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
    }
  }

  async function fetchPlaylists(limit: number = 100): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk || !musicKitStore.isAuthorized()) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await mk.api.library.playlists({ limit });
      setState((prev) => ({ ...prev, playlists: response.data, isLoading: false }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch playlists';
      setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
    }
  }

  async function fetchRecentlyAdded(limit: number = 25): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk || !musicKitStore.isAuthorized()) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await mk.api.library.recentlyAdded({ limit });
      setState((prev) => ({ ...prev, recentlyAdded: response.data, isLoading: false }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch recently added';
      setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
    }
  }

  async function fetchAll(): Promise<void> {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    await Promise.all([fetchSongs(), fetchAlbums(), fetchPlaylists(), fetchRecentlyAdded()]);
    setState((prev) => ({ ...prev, isLoading: false }));
  }

  return {
    state,
    fetchSongs,
    fetchAlbums,
    fetchPlaylists,
    fetchRecentlyAdded,
    fetchAll,
  };
}

export const libraryStore = createRoot(createLibraryStore);
