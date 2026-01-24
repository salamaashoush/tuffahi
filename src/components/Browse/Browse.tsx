import { Component, createSignal, For, onMount, Show } from 'solid-js';
import { musicKitStore } from '../../stores/musickit';
import { playerStore } from '../../stores/player';
import { formatArtworkUrl } from '../../lib/musickit';

interface ChartData {
  songs: MusicKit.MediaItem[];
  albums: MusicKit.MediaItem[];
  playlists: MusicKit.MediaItem[];
}

const Browse: Component = () => {
  const [charts, setCharts] = createSignal<ChartData | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    const mk = musicKitStore.instance();
    if (!mk) return;

    setIsLoading(true);

    try {
      const response = await mk.api.music('/v1/catalog/us/charts', {
        types: 'songs,albums,playlists',
        limit: 20,
      });

      const data = response.data as {
        results: {
          songs?: { data: MusicKit.MediaItem[] }[];
          albums?: { data: MusicKit.MediaItem[] }[];
          playlists?: { data: MusicKit.MediaItem[] }[];
        };
      };

      setCharts({
        songs: data.results.songs?.[0]?.data || [],
        albums: data.results.albums?.[0]?.data || [],
        playlists: data.results.playlists?.[0]?.data || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load charts');
    } finally {
      setIsLoading(false);
    }
  });

  const handlePlaySong = (songId: string) => {
    playerStore.playSong(songId);
  };

  const handlePlayAlbum = (albumId: string) => {
    playerStore.playAlbum(albumId);
  };

  const handlePlayPlaylist = (playlistId: string) => {
    playerStore.playPlaylist(playlistId);
  };

  return (
    <div class="space-y-10">
      <h1 class="text-3xl font-bold text-white">Browse</h1>

      <Show when={error()}>
        <div class="bg-red-500/20 border border-red-500/40 rounded-lg p-4">
          <p class="text-red-400">{error()}</p>
        </div>
      </Show>

      <Show
        when={!isLoading()}
        fallback={
          <div class="space-y-10">
            <For each={Array(3).fill(0)}>
              {() => (
                <div>
                  <div class="h-6 bg-surface-secondary rounded w-32 mb-4" />
                  <div class="flex gap-4 overflow-hidden">
                    <For each={Array(6).fill(0)}>
                      {() => (
                        <div class="w-40 flex-shrink-0 animate-pulse">
                          <div class="aspect-square bg-surface-secondary rounded-lg mb-2" />
                          <div class="h-4 bg-surface-secondary rounded w-3/4 mb-1" />
                          <div class="h-3 bg-surface-secondary rounded w-1/2" />
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </For>
          </div>
        }
      >
        <Show when={charts()}>
          {(data) => (
            <>
              {/* Top Songs */}
              <Show when={data().songs.length > 0}>
                <section>
                  <h2 class="text-xl font-semibold text-white mb-4">Top Songs</h2>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <For each={data().songs.slice(0, 10)}>
                      {(song, index) => (
                        <button
                          onClick={() => handlePlaySong(song.id)}
                          class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-smooth group text-left"
                        >
                          <span class="w-6 text-center text-sm text-white/40 font-medium">
                            {index() + 1}
                          </span>
                          <div class="w-12 h-12 relative">
                            <Show
                              when={song.attributes.artwork}
                              fallback={
                                <div class="w-full h-full bg-surface-secondary rounded flex items-center justify-center">
                                  <span class="text-white/20">♫</span>
                                </div>
                              }
                            >
                              <img
                                src={formatArtworkUrl(song.attributes.artwork, 96)}
                                alt=""
                                class="w-full h-full object-cover rounded"
                              />
                            </Show>
                            <div class="absolute inset-0 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center">
                              <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                          <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-white truncate">{song.attributes.name}</p>
                            <p class="text-xs text-white/60 truncate">{song.attributes.artistName}</p>
                          </div>
                        </button>
                      )}
                    </For>
                  </div>
                </section>
              </Show>

              {/* Top Albums */}
              <Show when={data().albums.length > 0}>
                <section>
                  <h2 class="text-xl font-semibold text-white mb-4">Top Albums</h2>
                  <div class="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    <For each={data().albums}>
                      {(album) => (
                        <button
                          onClick={() => handlePlayAlbum(album.id)}
                          class="w-40 flex-shrink-0 group text-left"
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
                                src={formatArtworkUrl(album.attributes.artwork, 320)}
                                alt={album.attributes.name}
                                class="w-full h-full object-cover rounded-lg album-shadow"
                              />
                            </Show>
                            <div class="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center">
                              <div class="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                                <svg class="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                          <p class="text-sm font-medium text-white truncate">{album.attributes.name}</p>
                          <p class="text-xs text-white/60 truncate">{album.attributes.artistName}</p>
                        </button>
                      )}
                    </For>
                  </div>
                </section>
              </Show>

              {/* Featured Playlists */}
              <Show when={data().playlists.length > 0}>
                <section>
                  <h2 class="text-xl font-semibold text-white mb-4">Featured Playlists</h2>
                  <div class="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    <For each={data().playlists}>
                      {(playlist) => (
                        <button
                          onClick={() => handlePlayPlaylist(playlist.id)}
                          class="w-40 flex-shrink-0 group text-left"
                        >
                          <div class="relative aspect-square mb-2">
                            <Show
                              when={playlist.attributes.artwork}
                              fallback={
                                <div class="w-full h-full bg-gradient-to-br from-apple-red to-apple-pink rounded-lg flex items-center justify-center">
                                  <span class="text-4xl text-white">♫</span>
                                </div>
                              }
                            >
                              <img
                                src={formatArtworkUrl(playlist.attributes.artwork, 320)}
                                alt={playlist.attributes.name}
                                class="w-full h-full object-cover rounded-lg album-shadow"
                              />
                            </Show>
                            <div class="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center">
                              <div class="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                                <svg class="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                          <p class="text-sm font-medium text-white truncate">{playlist.attributes.name}</p>
                          <p class="text-xs text-white/60">Apple Music</p>
                        </button>
                      )}
                    </For>
                  </div>
                </section>
              </Show>
            </>
          )}
        </Show>
      </Show>
    </div>
  );
};

export default Browse;
