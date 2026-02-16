import { Component, For, Show, createSignal, createEffect } from 'solid-js';
import { Portal } from 'solid-js/web';
import { musicKitStore } from '../../stores/musickit';
import { libraryStore } from '../../stores/library';
import { formatArtworkUrl } from '../../lib/musickit';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  trackName: string;
}

const AddToPlaylistModal: Component<AddToPlaylistModalProps> = (props) => {
  const [searchQuery, setSearchQuery] = createSignal('');
  const [isCreatingNew, setIsCreatingNew] = createSignal(false);
  const [newPlaylistName, setNewPlaylistName] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [success, setSuccess] = createSignal<string | null>(null);

  // Filter playlists based on search
  const filteredPlaylists = () => {
    const query = searchQuery().toLowerCase();
    return libraryStore.state().playlists.filter((p) =>
      p.attributes.name.toLowerCase().includes(query)
    );
  };

  // Refresh playlists when modal opens
  createEffect(() => {
    if (props.isOpen && musicKitStore.isAuthorized()) {
      libraryStore.fetchPlaylists();
    }
  });

  const handleAddToPlaylist = async (playlistId: string, playlistName: string) => {
    const mk = musicKitStore.instance();
    if (!mk) return;

    setIsLoading(true);
    setError(null);

    try {
      await mk.api.music(`/v1/me/library/playlists/${playlistId}/tracks`, {}, {
        fetchOptions: {
          method: 'POST',
          body: JSON.stringify({
            data: [{ id: props.trackId, type: 'songs' }]
          })
        }
      });

      setSuccess(`Added to "${playlistName}"`);
      setTimeout(() => {
        props.onClose();
        setSuccess(null);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to playlist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    const mk = musicKitStore.instance();
    if (!mk || !newPlaylistName().trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Create new playlist
      const response = await mk.api.music('/v1/me/library/playlists', {}, {
        fetchOptions: {
          method: 'POST',
          body: JSON.stringify({
            attributes: {
              name: newPlaylistName().trim(),
              description: '',
            },
            relationships: {
              tracks: {
                data: [{ id: props.trackId, type: 'songs' }]
              }
            }
          })
        }
      });

      setSuccess(`Created "${newPlaylistName()}" and added track`);
      libraryStore.fetchPlaylists();
      setTimeout(() => {
        props.onClose();
        setSuccess(null);
        setNewPlaylistName('');
        setIsCreatingNew(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create playlist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      props.onClose();
    }
  };

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs"
          onClick={(e) => e.target === e.currentTarget && props.onClose()}
          onKeyDown={handleKeyDown}
        >
          <div class="w-full max-w-md bg-surface rounded-xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Header */}
            <div class="flex items-center justify-between p-4 border-b border-white/10">
              <h2 class="text-lg font-semibold text-white">
                {isCreatingNew() ? 'New Playlist' : 'Add to Playlist'}
              </h2>
              <button
                onClick={props.onClose}
                class="p-1 text-white/60 hover:text-white transition-smooth"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Track Info */}
            <div class="px-4 py-3 bg-white/5 border-b border-white/10">
              <p class="text-sm text-white/60">Adding:</p>
              <p class="text-sm text-white font-medium truncate">{props.trackName}</p>
            </div>

            {/* Messages */}
            <Show when={error()}>
              <div class="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
                <p class="text-sm text-red-400">{error()}</p>
              </div>
            </Show>

            <Show when={success()}>
              <div class="mx-4 mt-4 p-3 bg-green-500/20 border border-green-500/40 rounded-lg">
                <p class="text-sm text-green-400">{success()}</p>
              </div>
            </Show>

            <Show
              when={!isCreatingNew()}
              fallback={
                /* Create New Playlist Form */
                <div class="p-4">
                  <input
                    type="text"
                    placeholder="Playlist name"
                    value={newPlaylistName()}
                    onInput={(e) => setNewPlaylistName(e.currentTarget.value)}
                    class="w-full px-4 py-3 bg-surface-secondary rounded-lg text-white placeholder-white/40 focus:outline-hidden focus:ring-2 focus:ring-apple-red mb-4"
                    autofocus
                  />
                  <div class="flex gap-3">
                    <button
                      onClick={() => setIsCreatingNew(false)}
                      class="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-smooth"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreatePlaylist}
                      disabled={!newPlaylistName().trim() || isLoading()}
                      class="flex-1 px-4 py-2 bg-apple-red hover:bg-apple-pink text-white rounded-lg transition-smooth disabled:opacity-50"
                    >
                      {isLoading() ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </div>
              }
            >
              {/* Search and Playlist List */}
              <div class="p-4">
                {/* Search */}
                <div class="relative mb-4">
                  <svg
                    class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Find a playlist"
                    value={searchQuery()}
                    onInput={(e) => setSearchQuery(e.currentTarget.value)}
                    class="w-full pl-10 pr-4 py-2 bg-surface-secondary rounded-lg text-white placeholder-white/40 focus:outline-hidden focus:ring-2 focus:ring-apple-red"
                  />
                </div>

                {/* New Playlist Button */}
                <button
                  onClick={() => setIsCreatingNew(true)}
                  class="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-smooth mb-4"
                >
                  <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-apple-red to-apple-pink flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span class="text-white font-medium">New Playlist</span>
                </button>

                {/* Playlist List */}
                <div class="max-h-64 overflow-y-auto space-y-1">
                  <Show
                    when={filteredPlaylists().length > 0}
                    fallback={
                      <div class="text-center py-8">
                        <p class="text-white/40">
                          {searchQuery() ? 'No playlists found' : 'No playlists yet'}
                        </p>
                      </div>
                    }
                  >
                    <For each={filteredPlaylists()}>
                      {(playlist) => (
                        <button
                          onClick={() => handleAddToPlaylist(playlist.id, playlist.attributes.name)}
                          disabled={isLoading()}
                          class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-smooth disabled:opacity-50"
                        >
                          <div class="w-10 h-10 rounded-sm flex-shrink-0">
                            <Show
                              when={playlist.attributes.artwork}
                              fallback={
                                <div class="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 rounded-sm flex items-center justify-center">
                                  <span class="text-white text-sm">♫</span>
                                </div>
                              }
                            >
                              <img
                                src={formatArtworkUrl(playlist.attributes.artwork, 80)}
                                alt=""
                                class="w-full h-full object-cover rounded-sm"
                              />
                            </Show>
                          </div>
                          <span class="text-white text-sm truncate">{playlist.attributes.name}</span>
                        </button>
                      )}
                    </For>
                  </Show>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </Portal>
    </Show>
  );
};

export default AddToPlaylistModal;

// Global modal state management
import { createContext, useContext, JSX } from 'solid-js';

interface ModalState {
  isOpen: boolean;
  trackId: string;
  trackName: string;
}

const AddToPlaylistModalContext = createContext<{
  open: (trackId: string, trackName: string) => void;
  close: () => void;
}>();

export const AddToPlaylistModalProvider: Component<{ children: JSX.Element }> = (props) => {
  const [state, setState] = createSignal<ModalState>({
    isOpen: false,
    trackId: '',
    trackName: '',
  });

  const open = (trackId: string, trackName: string) => {
    setState({ isOpen: true, trackId, trackName });
  };

  const close = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <AddToPlaylistModalContext.Provider value={{ open, close }}>
      {props.children}
      <AddToPlaylistModal
        isOpen={state().isOpen}
        trackId={state().trackId}
        trackName={state().trackName}
        onClose={close}
      />
    </AddToPlaylistModalContext.Provider>
  );
};

export const useAddToPlaylistModal = () => {
  const context = useContext(AddToPlaylistModalContext);
  if (!context) {
    throw new Error('useAddToPlaylistModal must be used within AddToPlaylistModalProvider');
  }
  return context;
};
