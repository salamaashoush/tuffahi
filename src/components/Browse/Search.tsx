import { Component, createSignal, For, Show } from 'solid-js';
import { musicKitStore } from '../../stores/musickit';
import { playerStore } from '../../stores/player';
import { formatArtworkUrl, formatDuration } from '../../lib/musickit';

interface SearchResult {
  songs: MusicKit.MediaItem[];
  albums: MusicKit.MediaItem[];
  artists: MusicKit.MediaItem[];
  playlists: MusicKit.MediaItem[];
}

const Search: Component = () => {
  const [query, setQuery] = createSignal('');
  const [results, setResults] = createSignal<SearchResult | null>(null);
  const [isSearching, setIsSearching] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  let searchTimeout: number | undefined;

  const handleSearch = (value: string) => {
    setQuery(value);
    setError(null);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!value.trim()) {
      setResults(null);
      return;
    }

    searchTimeout = setTimeout(async () => {
      const mk = musicKitStore.instance();
      if (!mk) return;

      setIsSearching(true);

      try {
        const response = await mk.api.music('/v1/catalog/{{storefrontId}}/search', {
          term: value,
          types: 'songs,albums,artists,playlists',
          limit: 10,
        });

        const data = response.data as {
          results: {
            songs?: { data: MusicKit.MediaItem[] };
            albums?: { data: MusicKit.MediaItem[] };
            artists?: { data: MusicKit.MediaItem[] };
            playlists?: { data: MusicKit.MediaItem[] };
          };
        };

        setResults({
          songs: data.results.songs?.data || [],
          albums: data.results.albums?.data || [],
          artists: data.results.artists?.data || [],
          playlists: data.results.playlists?.data || [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setIsSearching(false);
      }
    }, 300) as unknown as number;
  };

  const handlePlaySong = (songId: string) => {
    playerStore.playSong(songId);
  };

  const handlePlayAlbum = (albumId: string) => {
    playerStore.playAlbum(albumId);
  };

  return (
    <div>
      {/* Search Input */}
      <div class="mb-8">
        <div class="relative max-w-xl">
          <svg
            class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search songs, albums, artists..."
            value={query()}
            onInput={(e) => handleSearch(e.currentTarget.value)}
            class="w-full pl-12 pr-4 py-3 bg-surface-secondary rounded-xl text-white placeholder-white/40 focus:outline-hidden focus:ring-2 focus:ring-apple-red"
          />
          <Show when={isSearching()}>
            <div class="absolute right-4 top-1/2 -translate-y-1/2">
              <div class="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          </Show>
        </div>
      </div>

      {/* Error */}
      <Show when={error()}>
        <div class="bg-red-500/20 border border-red-500/40 rounded-lg p-4 mb-8">
          <p class="text-red-400">{error()}</p>
        </div>
      </Show>

      {/* Results */}
      <Show when={results()}>
        {(res) => (
          <div class="space-y-8">
            {/* Songs */}
            <Show when={res().songs.length > 0}>
              <section>
                <h2 class="text-xl font-semibold text-white mb-4">Songs</h2>
                <div class="space-y-1">
                  <For each={res().songs}>
                    {(song) => (
                      <button
                        onClick={() => handlePlaySong(song.id)}
                        class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-smooth group text-left"
                      >
                        <div class="w-12 h-12 relative">
                          <Show
                            when={song.attributes.artwork}
                            fallback={
                              <div class="w-full h-full bg-surface-secondary rounded-sm flex items-center justify-center">
                                <span class="text-white/20">♫</span>
                              </div>
                            }
                          >
                            <img
                              src={formatArtworkUrl(song.attributes.artwork, 96)}
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
                          <p class="text-sm font-medium text-white truncate">{song.attributes.name}</p>
                          <p class="text-xs text-white/60 truncate">{song.attributes.artistName}</p>
                        </div>
                        <span class="text-sm text-white/40">
                          {formatDuration(song.attributes.durationInMillis ?? 0)}
                        </span>
                      </button>
                    )}
                  </For>
                </div>
              </section>
            </Show>

            {/* Albums */}
            <Show when={res().albums.length > 0}>
              <section>
                <h2 class="text-xl font-semibold text-white mb-4">Albums</h2>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <For each={res().albums}>
                    {(album) => (
                      <button
                        onClick={() => handlePlayAlbum(album.id)}
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
                        <p class="text-sm font-medium text-white truncate">{album.attributes.name}</p>
                        <p class="text-xs text-white/60 truncate">{album.attributes.artistName}</p>
                      </button>
                    )}
                  </For>
                </div>
              </section>
            </Show>
          </div>
        )}
      </Show>

      {/* Empty State */}
      <Show when={!results() && !isSearching()}>
        <div class="text-center py-20">
          <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-surface-secondary flex items-center justify-center">
            <svg class="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-white mb-2">Search Apple Music</h2>
          <p class="text-white/60">Find your favorite songs, albums, and artists</p>
        </div>
      </Show>
    </div>
  );
};

export default Search;
