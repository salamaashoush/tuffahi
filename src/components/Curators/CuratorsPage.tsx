import { Component, createResource, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { musicKitStore } from '../../stores/musickit';
import { curatorAPI } from '../../services/api';
import { formatArtworkUrl } from '../../lib/musickit';

const CuratorsPage: Component = () => {
  const [curators] = createResource(
    () => musicKitStore.instance(),
    async () => {
      return curatorAPI.getCurators(50);
    }
  );

  return (
    <div class="pb-8">
      <h1 class="text-3xl font-bold text-white mb-2">Curators</h1>
      <p class="text-white/60 mb-8">Apple Music curators and their playlists</p>

      <Show when={curators.error}>
        <div class="bg-red-500/20 border border-red-500/40 rounded-lg p-4 mb-8">
          <p class="text-red-400">{curators.error?.message || 'Failed to load curators'}</p>
        </div>
      </Show>

      <Show
        when={!curators.loading}
        fallback={
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            <For each={Array(10).fill(0)}>
              {() => (
                <div class="animate-pulse">
                  <div class="aspect-square bg-surface-secondary rounded-xl mb-2" />
                  <div class="h-4 bg-surface-secondary rounded-sm w-3/4" />
                </div>
              )}
            </For>
          </div>
        }
      >
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <For each={curators() || []}>
            {(curator) => (
              <A
                href={`/curator/${curator.id}`}
                class="group text-center"
              >
                <div class="relative aspect-square mb-3 rounded-xl overflow-hidden">
                  <Show
                    when={curator.attributes?.artwork}
                    fallback={
                      <div class="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <svg class="w-12 h-12 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                    }
                  >
                    <img
                      src={formatArtworkUrl(curator.attributes.artwork, 300)}
                      alt={curator.attributes?.name}
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </Show>
                </div>
                <p class="text-sm font-medium text-white group-hover:underline truncate">
                  {curator.attributes?.name}
                </p>
                <Show when={curator.attributes?.editorialNotes?.short}>
                  <p class="text-xs text-white/60 mt-1 line-clamp-2">
                    {curator.attributes.editorialNotes.short}
                  </p>
                </Show>
              </A>
            )}
          </For>
        </div>

        <Show when={!curators()?.length && !curators.error}>
          <div class="text-center py-20">
            <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-surface-secondary flex items-center justify-center">
              <svg class="w-10 h-10 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <h2 class="text-xl font-semibold text-white mb-2">No Curators Found</h2>
            <p class="text-white/60">Curators are not available for your region</p>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default CuratorsPage;
