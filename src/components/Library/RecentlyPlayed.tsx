import { Component, For, Show } from 'solid-js';
import { libraryStore } from '../../stores/library';
import { playerStore } from '../../stores/player';
import { formatArtworkUrl } from '../../lib/musickit';

const RecentlyPlayed: Component = () => {
  const { state } = libraryStore;

  const handlePlay = (item: MusicKit.LibraryResource) => {
    playerStore.playMedia(item.type, item.id);
  };

  return (
    <div>
      <h2 class="text-2xl font-bold text-white mb-4">Recently Added</h2>

      <Show
        when={!state().isLoading}
        fallback={
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <For each={Array(10).fill(0)}>
              {() => (
                <div class="animate-pulse">
                  <div class="aspect-square bg-surface-secondary rounded-lg mb-2" />
                  <div class="h-4 bg-surface-secondary rounded w-3/4 mb-1" />
                  <div class="h-3 bg-surface-secondary rounded w-1/2" />
                </div>
              )}
            </For>
          </div>
        }
      >
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <For each={state().recentlyAdded}>
            {(item) => (
              <button
                onClick={() => handlePlay(item)}
                class="group text-left"
              >
                <div class="relative aspect-square mb-2">
                  <Show
                    when={item.attributes.artwork}
                    fallback={
                      <div class="w-full h-full bg-surface-secondary rounded-lg flex items-center justify-center">
                        <span class="text-4xl text-white/20">♫</span>
                      </div>
                    }
                  >
                    <img
                      src={formatArtworkUrl(item.attributes.artwork, 300)}
                      alt={item.attributes.name}
                      class="w-full h-full object-cover rounded-lg album-shadow"
                    />
                  </Show>

                  {/* Play overlay */}
                  <div class="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center">
                    <div class="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                      <svg class="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <p class="text-sm font-medium text-white truncate">
                  {item.attributes.name}
                </p>
                <p class="text-xs text-white/60 truncate">
                  {item.attributes.artistName}
                </p>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default RecentlyPlayed;
