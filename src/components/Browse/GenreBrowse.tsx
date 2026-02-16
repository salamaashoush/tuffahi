/**
 * Genre & Mood Browsing Component
 * Browse music by genres, moods, and activities
 */

import { Component, createSignal, createEffect, For, Show } from 'solid-js';
import { ArrowLeft, Play } from 'lucide-solid';
import { catalogAPI } from '../../services/api';
import { LazyImage } from '../LazyImage/LazyImage';
import { logger } from '../../services/logger';

interface Genre {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

// Pre-defined genres with colors
const MUSIC_GENRES: Genre[] = [
  { id: '34', name: 'Pop', color: 'from-pink-500 to-rose-600' },
  { id: '21', name: 'Rock', color: 'from-red-600 to-orange-600' },
  { id: '14', name: 'Hip-Hop/Rap', color: 'from-yellow-500 to-amber-600' },
  { id: '11', name: 'Electronic', color: 'from-purple-500 to-indigo-600' },
  { id: '15', name: 'R&B/Soul', color: 'from-blue-500 to-cyan-600' },
  { id: '6', name: 'Country', color: 'from-amber-500 to-yellow-600' },
  { id: '17', name: 'Dance', color: 'from-fuchsia-500 to-pink-600' },
  { id: '7', name: 'Classical', color: 'from-slate-500 to-gray-600' },
  { id: '8', name: 'Jazz', color: 'from-orange-500 to-red-600' },
  { id: '24', name: 'Reggae', color: 'from-green-500 to-emerald-600' },
  { id: '10', name: 'Latin', color: 'from-red-500 to-pink-600' },
  { id: '20', name: 'Alternative', color: 'from-teal-500 to-cyan-600' },
  { id: '2', name: 'Blues', color: 'from-blue-600 to-indigo-700' },
  { id: '35', name: 'K-Pop', color: 'from-violet-500 to-purple-600' },
  { id: '28', name: 'Indie', color: 'from-emerald-500 to-teal-600' },
  { id: '1153', name: 'Anime', color: 'from-pink-400 to-purple-500' },
];

// Mood/Activity categories
const MOODS = [
  { id: 'chill', name: 'Chill', color: 'from-cyan-500 to-blue-500', emoji: '😌' },
  { id: 'workout', name: 'Workout', color: 'from-orange-500 to-red-500', emoji: '💪' },
  { id: 'focus', name: 'Focus', color: 'from-indigo-500 to-purple-500', emoji: '🎯' },
  { id: 'party', name: 'Party', color: 'from-pink-500 to-yellow-500', emoji: '🎉' },
  { id: 'sleep', name: 'Sleep', color: 'from-slate-600 to-slate-800', emoji: '😴' },
  { id: 'romance', name: 'Romance', color: 'from-rose-500 to-red-500', emoji: '❤️' },
  { id: 'sad', name: 'Sad', color: 'from-blue-600 to-indigo-700', emoji: '😢' },
  { id: 'happy', name: 'Happy', color: 'from-yellow-400 to-orange-500', emoji: '😊' },
];

interface GenreBrowseProps {
  onSelectGenre?: (genreId: string, genreName: string) => void;
  onSelectMood?: (moodId: string, moodName: string) => void;
}

const GenreBrowse: Component<GenreBrowseProps> = (props) => {
  const [selectedGenre, setSelectedGenre] = createSignal<Genre | null>(null);
  const [genreContent, setGenreContent] = createSignal<{
    playlists: any[];
    albums: any[];
  }>({ playlists: [], albums: [] });
  const [isLoading, setIsLoading] = createSignal(false);

  const handleGenreClick = async (genre: Genre) => {
    setSelectedGenre(genre);
    props.onSelectGenre?.(genre.id, genre.name);

    setIsLoading(true);
    try {
      // Fetch genre-specific content
      const chartsResult = await catalogAPI.getCharts(['playlists', 'albums'], 20);

      setGenreContent({
        playlists: chartsResult?.playlists?.data || [],
        albums: chartsResult?.albums?.data || [],
      });
    } catch (error) {
      logger.error('genre-browse', 'Failed to fetch genre content', { error });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoodClick = (mood: typeof MOODS[0]) => {
    props.onSelectMood?.(mood.id, mood.name);
    // In a real implementation, this would search for mood-based playlists
  };

  return (
    <div class="p-6">
      {/* Moods Section */}
      <section class="mb-8">
        <h2 class="text-2xl font-bold text-white mb-4">Moods & Activities</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <For each={MOODS}>
            {(mood) => (
              <button
                onClick={() => handleMoodClick(mood)}
                class={`relative p-4 rounded-xl bg-gradient-to-br ${mood.color} hover:scale-105 transition-all duration-200 overflow-hidden group`}
              >
                <div class="text-3xl mb-2">{mood.emoji}</div>
                <div class="text-white font-medium text-sm">{mood.name}</div>
                <div class="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
              </button>
            )}
          </For>
        </div>
      </section>

      {/* Genres Grid */}
      <section class="mb-8">
        <h2 class="text-2xl font-bold text-white mb-4">Browse by Genre</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <For each={MUSIC_GENRES}>
            {(genre) => (
              <button
                onClick={() => handleGenreClick(genre)}
                class={`relative p-6 rounded-xl bg-gradient-to-br ${genre.color} hover:scale-105 transition-all duration-200 overflow-hidden group ${
                  selectedGenre()?.id === genre.id ? 'ring-2 ring-white' : ''
                }`}
              >
                <div class="text-white font-bold text-lg">{genre.name}</div>
                <div class="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
              </button>
            )}
          </For>
        </div>
      </section>

      {/* Genre Content */}
      <Show when={selectedGenre()}>
        <section class="mt-8">
          <div class="flex items-center gap-4 mb-6">
            <button
              onClick={() => setSelectedGenre(null)}
              class="p-2 rounded-full bg-surface-secondary hover:bg-surface-tertiary transition-smooth"
            >
              <ArrowLeft size={20} class="text-white" />
            </button>
            <h2 class="text-2xl font-bold text-white">{selectedGenre()?.name}</h2>
          </div>

          <Show
            when={!isLoading()}
            fallback={
              <div class="flex items-center justify-center py-12">
                <div class="animate-spin w-8 h-8 border-2 border-apple-red border-t-transparent rounded-full" />
              </div>
            }
          >
            {/* Playlists */}
            <Show when={genreContent().playlists.length > 0}>
              <div class="mb-8">
                <h3 class="text-lg font-semibold text-white mb-4">Top Playlists</h3>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  <For each={genreContent().playlists.slice(0, 12)}>
                    {(playlist: any) => (
                      <div class="group cursor-pointer">
                        <div class="relative aspect-square mb-2 rounded-lg overflow-hidden bg-surface-secondary">
                          <LazyImage
                            src={playlist.attributes?.artwork?.url?.replace('{w}', '300').replace('{h}', '300')}
                            alt={playlist.attributes?.name}
                            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <button class="opacity-0 group-hover:opacity-100 transition-opacity p-3 bg-apple-red rounded-full">
                              <Play size={24} class="text-white" fill="currentColor" />
                            </button>
                          </div>
                        </div>
                        <div class="text-white font-medium text-sm truncate">
                          {playlist.attributes?.name}
                        </div>
                        <div class="text-white/60 text-xs truncate">
                          {playlist.attributes?.curatorName}
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Albums */}
            <Show when={genreContent().albums.length > 0}>
              <div>
                <h3 class="text-lg font-semibold text-white mb-4">Top Albums</h3>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  <For each={genreContent().albums.slice(0, 12)}>
                    {(album: any) => (
                      <div class="group cursor-pointer">
                        <div class="relative aspect-square mb-2 rounded-lg overflow-hidden bg-surface-secondary">
                          <LazyImage
                            src={album.attributes?.artwork?.url?.replace('{w}', '300').replace('{h}', '300')}
                            alt={album.attributes?.name}
                            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <button class="opacity-0 group-hover:opacity-100 transition-opacity p-3 bg-apple-red rounded-full">
                              <Play size={24} class="text-white" fill="currentColor" />
                            </button>
                          </div>
                        </div>
                        <div class="text-white font-medium text-sm truncate">
                          {album.attributes?.name}
                        </div>
                        <div class="text-white/60 text-xs truncate">
                          {album.attributes?.artistName}
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </Show>
        </section>
      </Show>
    </div>
  );
};

export default GenreBrowse;
