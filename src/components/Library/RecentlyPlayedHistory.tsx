import { Component, createSignal, onMount, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { musicKitStore } from '../../stores/musickit';
import { playerStore } from '../../stores/player';
import { personalizedAPI } from '../../services/api';
import { formatArtworkUrl } from '../../lib/musickit';

const RecentlyPlayedHistory: Component = () => {
  const [items, setItems] = createSignal<MusicKit.MediaItem[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    if (!musicKitStore.isAuthorized()) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await personalizedAPI.getRecentlyPlayed();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recently played');
    } finally {
      setIsLoading(false);
    }
  });

  const handlePlay = (item: MusicKit.MediaItem) => {
    playerStore.playMedia(item.type, item.id);
  };

  const getItemLink = (item: MusicKit.MediaItem) => {
    if (item.type.includes('album')) return `/album/${item.id}`;
    if (item.type.includes('playlist')) return `/playlist/${item.id}`;
    if (item.type.includes('station')) return '#';
    return '#';
  };

  return (
    <div>
      <h2 class="text-2xl font-bold text-white mb-6">Recently Played</h2>

      <Show when={error()}>
        <div class="bg-red-500/20 border border-red-500/40 rounded-lg p-4 mb-6">
          <p class="text-red-400">{error()}</p>
        </div>
      </Show>

      <Show
        when={!isLoading()}
        fallback={
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
        }
      >
        <Show
          when={items().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center py-20">
              <div class="w-16 h-16 rounded-full bg-surface-secondary flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                </svg>
              </div>
              <p class="text-white/60">No recently played items</p>
              <p class="text-sm text-white/40 mt-1">Start listening to see your history here</p>
            </div>
          }
        >
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <For each={items()}>
              {(item) => (
                <div class="group">
                  <A href={getItemLink(item)} class="block">
                    <div class="relative aspect-square mb-2">
                      <Show
                        when={item.attributes.artwork}
                        fallback={
                          <div class="w-full h-full bg-surface-secondary rounded-lg flex items-center justify-center">
                            <span class="text-4xl text-white/20">&#9835;</span>
                          </div>
                        }
                      >
                        <img
                          src={formatArtworkUrl(item.attributes.artwork, 300)}
                          alt={item.attributes.name}
                          class="w-full h-full object-cover rounded-lg album-shadow-sm"
                        />
                      </Show>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handlePlay(item);
                        }}
                        class="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center"
                      >
                        <div class="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                          <svg class="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </button>
                    </div>
                  </A>
                  <A href={getItemLink(item)}>
                    <p class="text-sm font-medium text-white truncate hover:underline">
                      {item.attributes.name}
                    </p>
                  </A>
                  <p class="text-xs text-white/60 truncate">
                    {item.attributes.artistName || item.attributes.curatorName || ''}
                  </p>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default RecentlyPlayedHistory;
