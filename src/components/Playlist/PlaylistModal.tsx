/**
 * Playlist Management Modals
 * Create, edit, and manage playlists
 */

import { Component, createSignal, createEffect, Show, For } from 'solid-js';
import { X, Plus, Trash2, Check } from 'lucide-solid';
import { playlistAPI } from '../../services/api';
import { logger } from '../../services/logger';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (playlist: MusicKit.Playlist) => void;
  initialTracks?: string[]; // Track IDs to add on creation
}

export const CreatePlaylistModal: Component<CreatePlaylistModalProps> = (props) => {
  const [name, setName] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [isPublic, setIsPublic] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal('');

  createEffect(() => {
    if (props.isOpen) {
      setName('');
      setDescription('');
      setIsPublic(false);
      setError('');
    }
  });

  const handleCreate = async () => {
    if (!name().trim()) {
      setError('Please enter a playlist name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await playlistAPI.createPlaylist(
        name().trim(),
        description().trim() || undefined
      );

      if (result.data) {
        logger.info('playlist', 'Playlist created', { id: result.data.id, name: name() });

        // Add initial tracks if provided
        if (props.initialTracks && props.initialTracks.length > 0) {
          await playlistAPI.addToPlaylist(result.data.id, props.initialTracks);
        }

        props.onCreated?.(result.data);
        props.onClose();
      } else {
        setError(result.error || 'Failed to create playlist');
      }
    } catch (err) {
      logger.error('playlist', 'Failed to create playlist', { error: err });
      setError('An error occurred while creating the playlist');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={props.onClose}
      >
        <div
          class="bg-surface rounded-xl p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-white">Create Playlist</h2>
            <button
              onClick={props.onClose}
              class="text-white/40 hover:text-white transition-smooth"
            >
              <X size={20} />
            </button>
          </div>

          <Show when={error()}>
            <div class="mb-4 p-3 bg-apple-red/20 rounded-lg text-apple-red text-sm">
              {error()}
            </div>
          </Show>

          <div class="space-y-4">
            <div>
              <label class="block text-sm text-white/60 mb-2">Name</label>
              <input
                type="text"
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
                placeholder="My Playlist"
                class="w-full px-3 py-2 bg-surface-tertiary rounded-lg text-white placeholder-white/40 focus:outline-hidden focus:ring-2 focus:ring-apple-red"
                autofocus
              />
            </div>

            <div>
              <label class="block text-sm text-white/60 mb-2">Description (optional)</label>
              <textarea
                value={description()}
                onInput={(e) => setDescription(e.currentTarget.value)}
                placeholder="Add a description..."
                rows={3}
                class="w-full px-3 py-2 bg-surface-tertiary rounded-lg text-white placeholder-white/40 focus:outline-hidden focus:ring-2 focus:ring-apple-red resize-none"
              />
            </div>

            <Show when={props.initialTracks && props.initialTracks.length > 0}>
              <div class="text-sm text-white/60">
                {props.initialTracks!.length} track(s) will be added to this playlist
              </div>
            </Show>
          </div>

          <div class="flex gap-3 mt-6">
            <button
              onClick={props.onClose}
              class="flex-1 py-2 bg-surface-secondary hover:bg-surface-tertiary text-white rounded-lg transition-smooth"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isLoading()}
              class="flex-1 py-2 bg-apple-red hover:bg-apple-pink text-white font-medium rounded-lg transition-smooth disabled:opacity-50"
            >
              {isLoading() ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

interface EditPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: MusicKit.Playlist | null;
  onUpdated?: (playlist: MusicKit.Playlist) => void;
  onDeleted?: () => void;
}

export const EditPlaylistModal: Component<EditPlaylistModalProps> = (props) => {
  const [name, setName] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [error, setError] = createSignal('');

  createEffect(() => {
    if (props.isOpen && props.playlist) {
      setName(props.playlist.attributes?.name || '');
      setDescription(props.playlist.attributes?.description?.standard || '');
      setError('');
      setShowDeleteConfirm(false);
    }
  });

  const handleSave = async () => {
    if (!props.playlist) return;
    if (!name().trim()) {
      setError('Please enter a playlist name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await playlistAPI.renamePlaylist(props.playlist.id, name().trim());

      if (result.data) {
        logger.info('playlist', 'Playlist updated', { id: props.playlist.id });
        props.onUpdated?.(result.data);
        props.onClose();
      } else {
        setError(result.error || 'Failed to update playlist');
      }
    } catch (err) {
      logger.error('playlist', 'Failed to update playlist', { error: err });
      setError('An error occurred while updating the playlist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!props.playlist) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await playlistAPI.deletePlaylist(props.playlist.id);

      if (result.success) {
        logger.info('playlist', 'Playlist deleted', { id: props.playlist.id });
        props.onDeleted?.();
        props.onClose();
      } else {
        setError(result.error || 'Failed to delete playlist');
      }
    } catch (err) {
      logger.error('playlist', 'Failed to delete playlist', { error: err });
      setError('An error occurred while deleting the playlist');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Show when={props.isOpen && props.playlist}>
      <div
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={props.onClose}
      >
        <div
          class="bg-surface rounded-xl p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-white">Edit Playlist</h2>
            <button
              onClick={props.onClose}
              class="text-white/40 hover:text-white transition-smooth"
            >
              <X size={20} />
            </button>
          </div>

          <Show when={error()}>
            <div class="mb-4 p-3 bg-apple-red/20 rounded-lg text-apple-red text-sm">
              {error()}
            </div>
          </Show>

          <Show
            when={!showDeleteConfirm()}
            fallback={
              <div class="text-center">
                <div class="mb-6">
                  <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-apple-red/20 flex items-center justify-center">
                    <Trash2 size={32} class="text-apple-red" />
                  </div>
                  <h3 class="text-lg font-semibold text-white mb-2">Delete Playlist?</h3>
                  <p class="text-white/60 text-sm">
                    Are you sure you want to delete "{props.playlist?.attributes?.name}"?
                    This action cannot be undone.
                  </p>
                </div>

                <div class="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    class="flex-1 py-2 bg-surface-secondary hover:bg-surface-tertiary text-white rounded-lg transition-smooth"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isLoading()}
                    class="flex-1 py-2 bg-apple-red hover:bg-apple-pink text-white font-medium rounded-lg transition-smooth disabled:opacity-50"
                  >
                    {isLoading() ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            }
          >
            <div class="space-y-4">
              <div>
                <label class="block text-sm text-white/60 mb-2">Name</label>
                <input
                  type="text"
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                  class="w-full px-3 py-2 bg-surface-tertiary rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-apple-red"
                />
              </div>

              <div>
                <label class="block text-sm text-white/60 mb-2">Description</label>
                <textarea
                  value={description()}
                  onInput={(e) => setDescription(e.currentTarget.value)}
                  rows={3}
                  class="w-full px-3 py-2 bg-surface-tertiary rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-apple-red resize-none"
                  disabled
                />
                <p class="text-xs text-white/40 mt-1">
                  Description editing is not currently supported by the API
                </p>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                class="px-4 py-2 text-apple-red hover:bg-apple-red/20 rounded-lg transition-smooth"
              >
                Delete
              </button>
              <div class="flex-1" />
              <button
                onClick={props.onClose}
                class="px-4 py-2 bg-surface-secondary hover:bg-surface-tertiary text-white rounded-lg transition-smooth"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading()}
                class="px-6 py-2 bg-apple-red hover:bg-apple-pink text-white font-medium rounded-lg transition-smooth disabled:opacity-50"
              >
                {isLoading() ? 'Saving...' : 'Save'}
              </button>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackIds: string[];
  playlists: MusicKit.Playlist[];
  onAdded?: (playlistId: string) => void;
}

export const AddToPlaylistModal: Component<AddToPlaylistModalProps> = (props) => {
  const [selectedPlaylist, setSelectedPlaylist] = createSignal<string | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [showCreateNew, setShowCreateNew] = createSignal(false);
  const [error, setError] = createSignal('');

  createEffect(() => {
    if (props.isOpen) {
      setSelectedPlaylist(null);
      setError('');
      setShowCreateNew(false);
    }
  });

  const handleAdd = async () => {
    if (!selectedPlaylist()) {
      setError('Please select a playlist');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await playlistAPI.addToPlaylist(selectedPlaylist()!, props.trackIds);

      if (result.success) {
        logger.info('playlist', 'Tracks added to playlist', {
          playlistId: selectedPlaylist(),
          count: props.trackIds.length,
        });
        props.onAdded?.(selectedPlaylist()!);
        props.onClose();
      } else {
        setError(result.error || 'Failed to add tracks to playlist');
      }
    } catch (err) {
      logger.error('playlist', 'Failed to add tracks to playlist', { error: err });
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Show when={props.isOpen}>
      <Show
        when={!showCreateNew()}
        fallback={
          <CreatePlaylistModal
            isOpen={true}
            onClose={() => setShowCreateNew(false)}
            initialTracks={props.trackIds}
            onCreated={() => {
              props.onClose();
            }}
          />
        }
      >
        <div
          class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={props.onClose}
        >
          <div
            class="bg-surface rounded-xl p-6 w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-semibold text-white">Add to Playlist</h2>
              <button
                onClick={props.onClose}
                class="text-white/40 hover:text-white transition-smooth"
              >
                <X size={20} />
              </button>
            </div>

            <p class="text-sm text-white/60 mb-4">
              Adding {props.trackIds.length} track(s)
            </p>

            <Show when={error()}>
              <div class="mb-4 p-3 bg-apple-red/20 rounded-lg text-apple-red text-sm">
                {error()}
              </div>
            </Show>

            <button
              onClick={() => setShowCreateNew(true)}
              class="flex items-center gap-3 p-3 mb-3 rounded-lg bg-surface-secondary hover:bg-surface-tertiary transition-smooth"
            >
              <div class="w-12 h-12 rounded-lg bg-apple-red flex items-center justify-center">
                <Plus size={24} class="text-white" />
              </div>
              <span class="text-white font-medium">Create New Playlist</span>
            </button>

            <div class="flex-1 overflow-y-auto space-y-2">
              <For each={props.playlists}>
                {(playlist) => (
                  <button
                    onClick={() => setSelectedPlaylist(playlist.id)}
                    class={`flex items-center gap-3 w-full p-3 rounded-lg transition-smooth ${
                      selectedPlaylist() === playlist.id
                        ? 'bg-apple-red/20 ring-2 ring-apple-red'
                        : 'bg-surface-secondary hover:bg-surface-tertiary'
                    }`}
                  >
                    <img
                      src={playlist.attributes?.artwork?.url?.replace('{w}', '100').replace('{h}', '100') || '/placeholder-album.png'}
                      alt={playlist.attributes?.name}
                      class="w-12 h-12 rounded-lg object-cover"
                    />
                    <div class="flex-1 text-left">
                      <div class="text-white font-medium truncate">
                        {playlist.attributes?.name}
                      </div>
                      <div class="text-sm text-white/60">
                        {playlist.attributes?.trackCount || 0} tracks
                      </div>
                    </div>
                    <Show when={selectedPlaylist() === playlist.id}>
                      <Check size={20} class="text-apple-red" />
                    </Show>
                  </button>
                )}
              </For>
            </div>

            <div class="flex gap-3 mt-4 pt-4 border-t border-white/10">
              <button
                onClick={props.onClose}
                class="flex-1 py-2 bg-surface-secondary hover:bg-surface-tertiary text-white rounded-lg transition-smooth"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!selectedPlaylist() || isLoading()}
                class="flex-1 py-2 bg-apple-red hover:bg-apple-pink text-white font-medium rounded-lg transition-smooth disabled:opacity-50"
              >
                {isLoading() ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </Show>
  );
};

export default CreatePlaylistModal;
