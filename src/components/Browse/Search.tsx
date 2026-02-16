import { Component, createSignal, For, Show } from 'solid-js';
import { useNavigate, A } from '@solidjs/router';
import { musicKitStore } from '../../stores/musickit';
import { playerStore } from '../../stores/player';
import { searchAPI, libraryAPI } from '../../services/api';
import { formatArtworkUrl, formatDuration } from '../../lib/musickit';
import QualityBadge from '../QualityBadge/QualityBadge';
import SearchSuggestions from './SearchSuggestions';

type SearchMode = 'catalog' | 'library';

interface SearchResult {
  songs: any[];
  albums: any[];
  artists: any[];
  playlists: any[];
}

const Search: Component = () => {
  const navigate = useNavigate();
  const [query, setQuery] = createSignal('');
  const [results, setResults] = createSignal<SearchResult | null>(null);
  const [isSearching, setIsSearching] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [searchMode, setSearchMode] = createSignal<SearchMode>('catalog');
  const [lyricsMode, setLyricsMode] = createSignal(false);
  const [suggestions, setSuggestions] = createSignal<any[]>([]);
  const [showSuggestions, setShowSuggestions] = createSignal(false);
  const [lyricHighlights, setLyricHighlights] = createSignal<Record<string, string[]>>({});

  let searchTimeout: number | undefined;
  let suggestionsTimeout: number | undefined;

  const fetchSuggestions = (value: string) => {
    if (suggestionsTimeout) clearTimeout(suggestionsTimeout);
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    suggestionsTimeout = setTimeout(async () => {
      try {
        const result = await searchAPI.searchSuggestions(value);
        setSuggestions(result);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 200) as unknown as number;
  };

  const executeSearch = async (value: string) => {
    const mk = musicKitStore.instance();
    if (!mk || !value.trim()) return;

    setIsSearching(true);
    setShowSuggestions(false);
    setError(null);

    try {
      if (searchMode() === 'library') {
        // Library search
        const libraryResults = await libraryAPI.search(value);
        setResults({
          songs: libraryResults?.['library-songs']?.data || [],
          albums: libraryResults?.['library-albums']?.data || [],
          artists: libraryResults?.['library-artists']?.data || [],
          playlists: libraryResults?.['library-playlists']?.data || [],
        });
        setLyricHighlights({});
      } else {
        // Catalog search
        const options = lyricsMode() ? { with: 'lyricHighlights' } : undefined;
        const data = await searchAPI.search(value, ['songs', 'albums', 'artists', 'playlists'], 10, options);

        setResults({
          songs: data?.songs?.data || [],
          albums: data?.albums?.data || [],
          artists: data?.artists?.data || [],
          playlists: data?.playlists?.data || [],
        });

        // Extract lyric highlights
        if (lyricsMode() && data?.songs?.data) {
          const highlights: Record<string, string[]> = {};
          for (const song of data.songs.data) {
            if (song.meta?.lyricHighlights) {
              highlights[song.id] = song.meta.lyricHighlights;
            }
          }
          setLyricHighlights(highlights);
        } else {
          setLyricHighlights({});
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleInput = (value: string) => {
    setQuery(value);
    setError(null);

    if (searchTimeout) clearTimeout(searchTimeout);

    if (!value.trim()) {
      setResults(null);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    fetchSuggestions(value);

    searchTimeout = setTimeout(() => {
      executeSearch(value);
    }, 400) as unknown as number;
  };

  const handleSelectTerm = (term: string) => {
    setQuery(term);
    setShowSuggestions(false);
    executeSearch(term);
  };

  const handleSelectItem = (item: any) => {
    setShowSuggestions(false);
    if (!item) return;
    const type = item.type;
    if (type === 'songs' || type === 'library-songs') {
      playerStore.playSong(item.id);
    } else if (type === 'albums' || type === 'library-albums') {
      playerStore.playAlbum(item.id);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      setShowSuggestions(false);
      executeSearch(query());
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handlePlaySong = (songId: string) => {
    playerStore.playSong(songId);
  };

  const handlePlayAlbum = (albumId: string) => {
    playerStore.playAlbum(albumId);
  };

  const navigateToArtist = async (e: MouseEvent, artistName: string) => {
    e.stopPropagation();
    const artistId = await searchAPI.findArtistId(artistName);
    if (artistId) navigate(`/artist/${artistId}`);
  };

  const navigateToAlbum = async (e: MouseEvent, albumName: string, artistName?: string) => {
    e.stopPropagation();
    const albumId = await searchAPI.findAlbumId(albumName, artistName);
    if (albumId) navigate(`/album/${albumId}`);
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
            placeholder={searchMode() === 'library' ? 'Search your library...' : 'Search songs, albums, artists...'}
            value={query()}
            onInput={(e) => handleInput(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions().length > 0) setShowSuggestions(true); }}
            onBlur={() => { setTimeout(() => setShowSuggestions(false), 200); }}
            class="w-full pl-12 pr-4 py-3 bg-surface-secondary rounded-xl text-white placeholder-white/40 focus:outline-hidden focus:ring-2 focus:ring-apple-red"
          />
          <Show when={isSearching()}>
            <div class="absolute right-4 top-1/2 -translate-y-1/2">
              <div class="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          </Show>

          {/* Suggestions Dropdown */}
          <Show when={showSuggestions() && suggestions().length > 0}>
            <SearchSuggestions
              suggestions={suggestions()}
              onSelectTerm={handleSelectTerm}
              onSelectItem={handleSelectItem}
            />
          </Show>
        </div>

        {/* Search Mode Toggles */}
        <div class="flex items-center gap-4 mt-3">
          {/* Catalog / Library Toggle */}
          <div class="flex bg-surface-secondary rounded-lg p-0.5">
            <button
              onClick={() => { setSearchMode('catalog'); if (query()) executeSearch(query()); }}
              class={`px-3 py-1.5 text-xs font-medium rounded-md transition-smooth ${
                searchMode() === 'catalog' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Apple Music
            </button>
            <button
              onClick={() => { setSearchMode('library'); if (query()) executeSearch(query()); }}
              class={`px-3 py-1.5 text-xs font-medium rounded-md transition-smooth ${
                searchMode() === 'library' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              My Library
            </button>
          </div>

          {/* Lyrics Toggle (only for catalog) */}
          <Show when={searchMode() === 'catalog'}>
            <button
              onClick={() => { setLyricsMode(!lyricsMode()); if (query()) executeSearch(query()); }}
              class={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-smooth ${
                lyricsMode()
                  ? 'bg-apple-red/20 text-apple-red border border-apple-red/30'
                  : 'bg-surface-secondary text-white/60 hover:text-white'
              }`}
            >
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 9H7v-2h6v2zm2-4H7V5h8v2z" />
              </svg>
              Search Lyrics
            </button>
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
                <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                  <For each={res().songs}>
                    {(song) => (
                      <button
                        onClick={() => handlePlaySong(song.id)}
                        class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-smooth group text-left"
                      >
                        <div class="w-10 h-10 relative flex-shrink-0">
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
                          <div class="flex items-center gap-1.5">
                            <p class="text-sm font-medium text-white truncate">{song.attributes.name}</p>
                            <QualityBadge audioTraits={song.attributes?.audioTraits} />
                          </div>
                          <p
                            class="text-xs text-white/60 truncate hover:text-white hover:underline cursor-pointer"
                            onClick={(e) => navigateToArtist(e, song.attributes.artistName)}
                          >
                            {song.attributes.artistName}
                            <Show when={song.attributes.albumName}>
                              {' — '}
                              <span
                                class="hover:text-white hover:underline"
                                onClick={(e) => navigateToAlbum(e, song.attributes.albumName, song.attributes.artistName)}
                              >{song.attributes.albumName}</span>
                            </Show>
                          </p>
                          {/* Lyric highlight snippets */}
                          <Show when={lyricHighlights()[song.id]}>
                            <div class="mt-1">
                              <For each={lyricHighlights()[song.id].slice(0, 2)}>
                                {(line) => (
                                  <p class="text-xs text-apple-red/80 italic truncate" innerHTML={line} />
                                )}
                              </For>
                            </div>
                          </Show>
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
                      <div class="group text-left">
                        <A href={`/album/${album.id}`} class="block">
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
                            <div
                              class="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePlayAlbum(album.id); }}
                            >
                              <div class="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                                <svg class="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                          <p class="text-sm font-medium text-white truncate">{album.attributes.name}</p>
                        </A>
                        <p
                          class="text-xs text-white/60 truncate hover:text-white hover:underline cursor-pointer"
                          onClick={(e) => navigateToArtist(e, album.attributes.artistName)}
                        >{album.attributes.artistName}</p>
                      </div>
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
