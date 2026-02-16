import { Component, createSignal, createResource, For, Show } from 'solid-js';
import { playerStore } from '../../stores/player';
import { storageService } from '../../services/storage';
import { formatDuration } from '../../lib/musickit';
import LazyImage from '../LazyImage/LazyImage';

interface HistoryEntry {
  id: string;
  type: string;
  playedAt: number;
  name?: string;
  artistName?: string;
  artworkUrl?: string;
  durationMs?: number;
}

const PlayHistory: Component = () => {
  const [version, setVersion] = createSignal(0);

  const [entries, { refetch }] = createResource(
    version,
    async (): Promise<HistoryEntry[]> => {
      return storageService.getPlayHistory();
    }
  );

  const handlePlay = (entry: HistoryEntry) => {
    playerStore.playMedia(entry.type, entry.id);
  };

  const handleClearHistory = async () => {
    await storageService.clearPlayHistory();
    setVersion(v => v + 1);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white">Play History</h2>
        <Show when={(entries() ?? []).length > 0}>
          <button
            onClick={handleClearHistory}
            class="text-sm text-white/60 hover:text-white transition-smooth"
          >
            Clear History
          </button>
        </Show>
      </div>

      <Show
        when={!entries.loading}
        fallback={
          <div class="space-y-2">
            <For each={Array(10).fill(0)}>
              {() => (
                <div class="flex items-center gap-4 p-3 animate-pulse">
                  <div class="w-10 h-10 bg-surface-secondary rounded-sm" />
                  <div class="flex-1 h-4 bg-surface-secondary rounded-sm" />
                  <div class="w-20 h-3 bg-surface-secondary rounded-sm" />
                </div>
              )}
            </For>
          </div>
        }
      >
        <Show
          when={(entries() ?? []).length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center py-20">
              <div class="w-16 h-16 rounded-full bg-surface-secondary flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                </svg>
              </div>
              <p class="text-white/60">No play history yet</p>
              <p class="text-sm text-white/40 mt-1">Songs you listen to will appear here</p>
            </div>
          }
        >
          <div class="space-y-1">
            <For each={entries()!}>
              {(entry) => (
                <button
                  onClick={() => handlePlay(entry)}
                  class="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/5 transition-smooth group text-left"
                >
                  {/* Artwork */}
                  <div class="w-10 h-10 flex-shrink-0 relative">
                    <Show
                      when={entry.artworkUrl}
                      fallback={
                        <div class="w-full h-full bg-surface-secondary rounded-sm flex items-center justify-center">
                          <span class="text-white/20 text-xs">&#9835;</span>
                        </div>
                      }
                    >
                      <LazyImage
                        src={entry.artworkUrl!}
                        alt={entry.name ?? ''}
                        class="w-full h-full object-cover rounded-sm"
                      />
                    </Show>
                    <div class="absolute inset-0 bg-black/50 rounded-sm opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center">
                      <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  {/* Track Info */}
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-white truncate">
                      {entry.name ?? `Song ${entry.id}`}
                    </p>
                    <p class="text-xs text-white/60 truncate">
                      {entry.artistName ?? 'Unknown Artist'}
                    </p>
                  </div>

                  {/* Duration */}
                  <Show when={entry.durationMs}>
                    <span class="text-sm text-white/40">
                      {formatDuration(entry.durationMs!)}
                    </span>
                  </Show>

                  {/* Played at */}
                  <span class="text-xs text-white/40 w-40 text-right flex-shrink-0">
                    {formatDate(entry.playedAt)}
                  </span>
                </button>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default PlayHistory;
