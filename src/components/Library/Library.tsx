import { Component, For, Show, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { libraryStore } from '../../stores/library';
import { musicKitStore } from '../../stores/musickit';
import { playerStore } from '../../stores/player';
import { formatArtworkUrl, formatDuration } from '../../lib/musickit';

interface LibraryProps {
  view?: 'songs' | 'albums' | 'artists';
}

const Library: Component<LibraryProps> = (props) => {
  const view = () => props.view || 'songs';

  return (
    <div>
      <Show
        when={musicKitStore.isAuthorized()}
        fallback={
          <div class="flex flex-col items-center justify-center py-20">
            <div class="w-20 h-20 rounded-full bg-surface-secondary flex items-center justify-center mb-4">
              <span class="text-4xl text-white/20">♫</span>
            </div>
            <h2 class="text-xl font-semibold text-white mb-2">Sign in to Apple Music</h2>
            <p class="text-white/60 text-center mb-6 max-w-md">
              Sign in with your Apple ID to access your music library, playlists, and
              personalized recommendations.
            </p>
            <button
              onClick={() => musicKitStore.authorize()}
              class="px-6 py-3 bg-apple-red hover:bg-apple-pink text-white font-medium rounded-full transition-smooth"
            >
              Sign In
            </button>
          </div>
        }
      >
        <Show when={view() === 'songs'}>
          <SongsView />
        </Show>
        <Show when={view() === 'albums'}>
          <AlbumsView />
        </Show>
        <Show when={view() === 'artists'}>
          <ArtistsView />
        </Show>
      </Show>
    </div>
  );
};

const SongsView: Component = () => {
  const { state } = libraryStore;

  const handlePlay = (songId: string) => {
    playerStore.playSong(songId);
  };

  return (
    <div>
      <h2 class="text-2xl font-bold text-white mb-4">Songs</h2>

      <Show
        when={!state().isLoading && state().songs.length > 0}
        fallback={
          <Show
            when={state().isLoading}
            fallback={
              <div class="text-center py-12">
                <p class="text-white/40">No songs in your library</p>
              </div>
            }
          >
            <div class="space-y-2">
              <For each={Array(10).fill(0)}>
                {() => (
                  <div class="flex items-center gap-3 p-2 animate-pulse">
                    <div class="w-10 h-10 bg-surface-secondary rounded-sm" />
                    <div class="flex-1">
                      <div class="h-4 bg-surface-secondary rounded-sm w-1/3 mb-1" />
                      <div class="h-3 bg-surface-secondary rounded-sm w-1/4" />
                    </div>
                    <div class="h-3 bg-surface-secondary rounded-sm w-12" />
                  </div>
                )}
              </For>
            </div>
          </Show>
        }
      >
        <div class="space-y-1">
          {/* Header */}
          <div class="flex items-center gap-3 px-2 py-2 text-xs text-white/40 uppercase tracking-wider border-b border-white/10">
            <div class="w-10" />
            <div class="flex-1">Title</div>
            <div class="w-40 hidden md:block">Album</div>
            <div class="w-16 text-right">Duration</div>
          </div>

          <For each={state().songs}>
            {(song) => (
              <button
                onClick={() => handlePlay(song.id)}
                class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-smooth group text-left"
              >
                <div class="w-10 h-10 relative">
                  <Show
                    when={song.attributes.artwork}
                    fallback={
                      <div class="w-full h-full bg-surface-secondary rounded-sm flex items-center justify-center">
                        <span class="text-white/20">♫</span>
                      </div>
                    }
                  >
                    <img
                      src={formatArtworkUrl(song.attributes.artwork, 80)}
                      alt=""
                      class="w-full h-full object-cover rounded-sm"
                    />
                  </Show>
                  <div class="absolute inset-0 bg-black/50 rounded-sm opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center">
                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>

                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-white truncate">
                    {song.attributes.name}
                  </p>
                  <p class="text-xs text-white/60 truncate">
                    {song.attributes.artistName}
                  </p>
                </div>

                <div class="w-40 hidden md:block">
                  <p class="text-sm text-white/60 truncate">
                    {song.attributes.albumName}
                  </p>
                </div>

                <div class="w-16 text-right">
                  <span class="text-sm text-white/60">
                    {formatDuration(song.attributes.durationInMillis)}
                  </span>
                </div>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

const AlbumsView: Component = () => {
  const { state } = libraryStore;

  const handlePlay = (albumId: string) => {
    playerStore.playAlbum(albumId);
  };

  return (
    <div>
      <h2 class="text-2xl font-bold text-white mb-4">Albums</h2>

      <Show
        when={!state().isLoading && state().albums.length > 0}
        fallback={
          <Show
            when={state().isLoading}
            fallback={
              <div class="text-center py-12">
                <p class="text-white/40">No albums in your library</p>
              </div>
            }
          >
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <For each={Array(10).fill(0)}>
                {() => (
                  <div class="animate-pulse">
                    <div class="aspect-square bg-surface-secondary rounded-lg mb-2" />
                    <div class="h-4 bg-surface-secondary rounded-sm w-3/4 mb-1" />
                    <div class="h-3 bg-surface-secondary rounded-sm w-1/2" />
                  </div>
                )}
              </For>
            </div>
          </Show>
        }
      >
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <For each={state().albums}>
            {(album) => (
              <button
                onClick={() => handlePlay(album.id)}
                class="group text-left"
              >
                <div class="relative aspect-square mb-2">
                  <Show
                    when={album.attributes.artwork}
                    fallback={
                      <div class="w-full h-full bg-surface-secondary rounded-lg flex items-center justify-center">
                        <span class="text-4xl text-white/20">♫</span>
                      </div>
                    }
                  >
                    <img
                      src={formatArtworkUrl(album.attributes.artwork, 300)}
                      alt={album.attributes.name}
                      class="w-full h-full object-cover rounded-lg album-shadow-sm"
                    />
                  </Show>

                  <div class="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center">
                    <div class="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                      <svg class="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <p class="text-sm font-medium text-white truncate">
                  {album.attributes.name}
                </p>
                <p class="text-xs text-white/60 truncate">
                  {album.attributes.artistName}
                </p>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

const ArtistsView: Component = () => {
  const { state, fetchArtists } = libraryStore;
  const navigate = useNavigate();

  onMount(() => {
    if (state().artists.length === 0) {
      fetchArtists();
    }
  });

  return (
    <div>
      <h2 class="text-2xl font-bold text-white mb-4">Artists</h2>

      <Show
        when={!state().isLoading && state().artists.length > 0}
        fallback={
          <Show
            when={state().isLoading}
            fallback={
              <div class="text-center py-12">
                <p class="text-white/40">No artists in your library</p>
              </div>
            }
          >
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <For each={Array(10).fill(0)}>
                {() => (
                  <div class="animate-pulse flex flex-col items-center">
                    <div class="w-32 h-32 bg-surface-secondary rounded-full mb-2" />
                    <div class="h-4 bg-surface-secondary rounded-sm w-20" />
                  </div>
                )}
              </For>
            </div>
          </Show>
        }
      >
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <For each={state().artists}>
            {(artist) => {
              const catalogId = () => artist.relationships?.catalog?.data?.[0]?.id;

              return (
                <button
                  onClick={() => {
                    const cid = catalogId();
                    if (cid) {
                      navigate(`/artist/${cid}`);
                    }
                  }}
                  class="group flex flex-col items-center text-center"
                >
                  <div class="relative w-32 h-32 mb-2">
                    <Show
                      when={artist.attributes?.artwork}
                      fallback={
                        <div class="w-full h-full bg-surface-secondary rounded-full flex items-center justify-center">
                          <span class="text-4xl text-white/20">&#9835;</span>
                        </div>
                      }
                    >
                      <img
                        src={formatArtworkUrl(artist.attributes.artwork, 256)}
                        alt={artist.attributes.name}
                        class="w-full h-full object-cover rounded-full"
                      />
                    </Show>
                    <div class="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center">
                      <div class="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                        <svg class="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <p class="text-sm font-medium text-white truncate max-w-[140px]">
                    {artist.attributes?.name}
                  </p>
                </button>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default Library;
