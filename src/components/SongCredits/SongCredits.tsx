/**
 * Song Credits Component
 * Display detailed credits for a song (writers, producers, engineers, etc.)
 */

import { Component, createSignal, createEffect, For, Show } from 'solid-js';
import { catalogAPI } from '../../services/api';
import { LazyImage } from '../LazyImage/LazyImage';
import { logger } from '../../services/logger';

interface SongCreditsProps {
  isOpen: boolean;
  onClose: () => void;
  songId: string | null;
  songInfo?: {
    name: string;
    artistName: string;
    albumName?: string;
    artworkUrl?: string;
  };
}

interface CreditPerson {
  name: string;
  role: string;
}

interface Credits {
  composers: string[];
  lyricists: string[];
  producers: string[];
  engineers: string[];
  performers: CreditPerson[];
  recordLabel: string;
  releaseDate: string;
  copyright: string;
  isrc: string;
  genre: string[];
}

const SongCredits: Component<SongCreditsProps> = (props) => {
  const [credits, setCredits] = createSignal<Credits | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(async () => {
    if (props.isOpen && props.songId) {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch song details with extended attributes
        const result = await catalogAPI.getSong(props.songId);

        if (result.data) {
          const song = result.data;
          const attrs = song.attributes;

          // Parse credits from song attributes
          // Note: MusicKit provides limited credit information
          // In a real app, you might need to use additional APIs or scraping
          const parsedCredits: Credits = {
            composers: attrs?.composerName ? [attrs.composerName] : [],
            lyricists: [],
            producers: [],
            engineers: [],
            performers: [
              { name: attrs?.artistName || 'Unknown Artist', role: 'Primary Artist' },
            ],
            recordLabel: attrs?.recordLabel || 'Unknown Label',
            releaseDate: attrs?.releaseDate || 'Unknown',
            copyright: attrs?.copyright || '',
            isrc: attrs?.isrc || '',
            genre: attrs?.genreNames || [],
          };

          // Try to parse additional credits from editorialNotes or other fields
          if (attrs?.editorialNotes?.standard) {
            // Extract credits mentioned in editorial notes (simplified parsing)
            const notes = attrs.editorialNotes.standard.toLowerCase();
            // This is a placeholder - real implementation would need proper parsing
          }

          setCredits(parsedCredits);
        } else {
          setError('Could not load song credits');
        }
      } catch (err) {
        logger.error('song-credits', 'Failed to fetch credits', { error: err });
        setError('Failed to load credits');
      } finally {
        setIsLoading(false);
      }
    }
  });

  const CreditSection: Component<{ title: string; items: string[] }> = (sectionProps) => (
    <Show when={sectionProps.items.length > 0}>
      <div class="mb-6">
        <h4 class="text-sm font-medium text-white/60 uppercase tracking-wider mb-2">
          {sectionProps.title}
        </h4>
        <div class="space-y-1">
          <For each={sectionProps.items}>
            {(item) => <div class="text-white">{item}</div>}
          </For>
        </div>
      </div>
    </Show>
  );

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={props.onClose}
      >
        <div
          class="bg-surface rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with song info */}
          <div class="p-6 bg-gradient-to-b from-surface-secondary to-surface">
            <div class="flex items-center gap-4 mb-4">
              <button
                onClick={props.onClose}
                class="text-white/40 hover:text-white transition-smooth"
              >
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
              <h2 class="text-xl font-semibold text-white">Song Credits</h2>
            </div>

            <Show when={props.songInfo}>
              <div class="flex items-center gap-4">
                <div class="w-20 h-20 rounded-lg overflow-hidden bg-surface-tertiary flex-shrink-0">
                  <LazyImage
                    src={props.songInfo?.artworkUrl?.replace('{w}', '160').replace('{h}', '160')}
                    alt={props.songInfo?.name}
                    class="w-full h-full object-cover"
                  />
                </div>
                <div class="min-w-0">
                  <h3 class="text-lg font-semibold text-white truncate">
                    {props.songInfo?.name}
                  </h3>
                  <p class="text-white/60 truncate">{props.songInfo?.artistName}</p>
                  <Show when={props.songInfo?.albumName}>
                    <p class="text-white/40 text-sm truncate">{props.songInfo?.albumName}</p>
                  </Show>
                </div>
              </div>
            </Show>
          </div>

          {/* Credits content */}
          <div class="p-6 overflow-y-auto max-h-[50vh]">
            <Show
              when={!isLoading()}
              fallback={
                <div class="flex items-center justify-center py-12">
                  <div class="animate-spin w-8 h-8 border-2 border-apple-red border-t-transparent rounded-full" />
                </div>
              }
            >
              <Show
                when={!error()}
                fallback={
                  <div class="text-center py-8 text-white/60">{error()}</div>
                }
              >
                <Show when={credits()}>
                  {/* Performers */}
                  <Show when={credits()!.performers.length > 0}>
                    <div class="mb-6">
                      <h4 class="text-sm font-medium text-white/60 uppercase tracking-wider mb-2">
                        Performers
                      </h4>
                      <div class="space-y-2">
                        <For each={credits()!.performers}>
                          {(performer) => (
                            <div class="flex justify-between">
                              <span class="text-white">{performer.name}</span>
                              <span class="text-white/40 text-sm">{performer.role}</span>
                            </div>
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>

                  <CreditSection title="Composers" items={credits()!.composers} />
                  <CreditSection title="Lyricists" items={credits()!.lyricists} />
                  <CreditSection title="Producers" items={credits()!.producers} />
                  <CreditSection title="Engineers" items={credits()!.engineers} />

                  {/* Genres */}
                  <Show when={credits()!.genre.length > 0}>
                    <div class="mb-6">
                      <h4 class="text-sm font-medium text-white/60 uppercase tracking-wider mb-2">
                        Genre
                      </h4>
                      <div class="flex flex-wrap gap-2">
                        <For each={credits()!.genre}>
                          {(genre) => (
                            <span class="px-3 py-1 bg-surface-secondary rounded-full text-sm text-white">
                              {genre}
                            </span>
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>

                  {/* Metadata */}
                  <div class="pt-4 border-t border-white/10 space-y-3">
                    <Show when={credits()!.recordLabel}>
                      <div class="flex justify-between text-sm">
                        <span class="text-white/60">Record Label</span>
                        <span class="text-white">{credits()!.recordLabel}</span>
                      </div>
                    </Show>

                    <Show when={credits()!.releaseDate}>
                      <div class="flex justify-between text-sm">
                        <span class="text-white/60">Release Date</span>
                        <span class="text-white">
                          {new Date(credits()!.releaseDate).toLocaleDateString()}
                        </span>
                      </div>
                    </Show>

                    <Show when={credits()!.isrc}>
                      <div class="flex justify-between text-sm">
                        <span class="text-white/60">ISRC</span>
                        <span class="text-white font-mono text-xs">{credits()!.isrc}</span>
                      </div>
                    </Show>

                    <Show when={credits()!.copyright}>
                      <div class="mt-4 text-xs text-white/40">
                        {credits()!.copyright}
                      </div>
                    </Show>
                  </div>
                </Show>
              </Show>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default SongCredits;
