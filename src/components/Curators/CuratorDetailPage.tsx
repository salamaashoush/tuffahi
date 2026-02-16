import { Component, createResource, For, Show } from 'solid-js';
import { useParams, A } from '@solidjs/router';
import { musicKitStore } from '../../stores/musickit';
import { curatorAPI } from '../../services/api';
import { playerStore } from '../../stores/player';
import { formatArtworkUrl } from '../../lib/musickit';

const CuratorDetailPage: Component = () => {
  const params = useParams<{ id: string }>();

  const [curator] = createResource(
    () => {
      const mk = musicKitStore.instance();
      const id = params.id;
      return mk && id ? id : null;
    },
    async (id) => {
      return curatorAPI.getCurator(id);
    }
  );

  const playlists = () => curator()?.relationships?.playlists?.data || [];

  return (
    <div class="pb-8">
      <Show when={curator.error}>
        <div class="bg-red-500/20 border border-red-500/40 rounded-lg p-4 mb-6">
          <p class="text-red-400">{curator.error?.message || 'Failed to load curator'}</p>
        </div>
      </Show>

      <Show
        when={!curator.loading && curator()}
        fallback={
          <div class="animate-pulse">
            <div class="h-48 bg-surface-secondary rounded-xl mb-6" />
            <div class="h-8 bg-surface-secondary rounded-sm w-1/3 mb-8" />
          </div>
        }
      >
        {(curatorData) => (
          <div class="space-y-8">
            {/* Curator Header */}
            <div class="relative h-48 rounded-xl overflow-hidden">
              <Show
                when={curatorData().attributes?.artwork}
                fallback={
                  <div class="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <svg class="w-20 h-20 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                }
              >
                <img
                  src={formatArtworkUrl(curatorData().attributes.artwork, 800)}
                  alt={curatorData().attributes?.name}
                  class="w-full h-full object-cover"
                />
              </Show>
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div class="absolute bottom-0 left-0 p-6">
                <p class="text-xs text-white/60 uppercase tracking-wider mb-1">Curator</p>
                <h1 class="text-3xl font-bold text-white">{curatorData().attributes?.name}</h1>
                <Show when={curatorData().attributes?.editorialNotes?.short}>
                  <p class="text-sm text-white/60 mt-2 max-w-xl">
                    {curatorData().attributes.editorialNotes.short}
                  </p>
                </Show>
              </div>
            </div>

            {/* Playlists */}
            <Show when={playlists().length > 0}>
              <section>
                <h2 class="text-xl font-semibold text-white mb-4">Playlists</h2>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <For each={playlists()}>
                    {(playlist) => (
                      <A
                        href={`/playlist/${playlist.id}`}
                        class="group text-left"
                      >
                        <div class="relative aspect-square mb-2">
                          <Show
                            when={playlist.attributes?.artwork}
                            fallback={
                              <div class="w-full h-full bg-gradient-to-br from-apple-red to-apple-pink rounded-lg flex items-center justify-center">
                                <span class="text-4xl text-white">♫</span>
                              </div>
                            }
                          >
                            <img
                              src={formatArtworkUrl(playlist.attributes.artwork, 300)}
                              alt={playlist.attributes?.name}
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
                        <p class="text-sm font-medium text-white truncate group-hover:underline">
                          {playlist.attributes?.name}
                        </p>
                        <Show when={playlist.attributes?.curatorName}>
                          <p class="text-xs text-white/60 truncate">{playlist.attributes.curatorName}</p>
                        </Show>
                      </A>
                    )}
                  </For>
                </div>
              </section>
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
};

export default CuratorDetailPage;
