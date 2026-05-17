import { Component, createResource, For, Show } from 'solid-js';
import { useParams, A } from '@solidjs/router';
import { musicKitStore } from '../../stores/musickit';
import { playerStore } from '../../stores/player';
import { catalogAPI } from '../../services/api';
import { formatArtworkUrl } from '../../lib/musickit';

interface GenreData {
  name: string;
  songs: any[];
  albums: any[];
  playlists: any[];
}

const chartData = (c: any): any[] => c?.data ?? [];

const GenrePage: Component = () => {
  const params = useParams<{ id: string }>();

  const [data] = createResource(
    () => {
      const mk = musicKitStore.instance();
      const id = params.id;
      return mk && id ? { mk, id } : null;
    },
    async ({ mk, id }): Promise<GenreData> => {
      let name = 'Genre';
      try {
        const r = await mk.api.music(`/v1/catalog/{{storefrontId}}/genres/${id}`);
        name = (r.data as { data?: any[] }).data?.[0]?.attributes?.name ?? name;
      } catch {
        // generic title fallback
      }
      const charts = await catalogAPI.getGenreCharts(id, 24).catch(() => ({} as any));
      return {
        name,
        // charts results are keyed arrays of { chart, data }
        songs: chartData((charts as any).songs?.[0]),
        albums: chartData((charts as any).albums?.[0]),
        playlists: chartData((charts as any).playlists?.[0]),
      };
    }
  );

  const AlbumGrid = (p: { items: any[] }) => (
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <For each={p.items}>
        {(album) => (
          <div class="group text-left">
            <A href={`/album/${album.id}`} class="block">
              <div class="relative aspect-square mb-2">
                <Show
                  when={album.attributes?.artwork}
                  fallback={
                    <div class="w-full h-full bg-surface-secondary rounded-lg flex items-center justify-center">
                      <span class="text-4xl text-white/20">♫</span>
                    </div>
                  }
                >
                  <img
                    src={formatArtworkUrl(album.attributes.artwork, 300)}
                    alt={album.attributes?.name}
                    class="w-full h-full object-cover rounded-lg album-shadow-sm"
                  />
                </Show>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); playerStore.playAlbum(album.id); }}
                  class="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center"
                  title="Play"
                >
                  <div class="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                    <svg class="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </button>
              </div>
              <p class="text-sm font-medium text-white truncate group-hover:underline">{album.attributes?.name}</p>
            </A>
            <Show when={album.attributes?.artistName}>
              <p class="text-xs text-white/60 truncate">{album.attributes.artistName}</p>
            </Show>
          </div>
        )}
      </For>
    </div>
  );

  const PlaylistGrid = (p: { items: any[] }) => (
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <For each={p.items}>
        {(pl) => (
          <div class="group text-left">
            <A href={`/playlist/${pl.id}`} class="block">
              <div class="relative aspect-square mb-2">
                <Show
                  when={pl.attributes?.artwork}
                  fallback={
                    <div class="w-full h-full bg-surface-secondary rounded-lg flex items-center justify-center">
                      <span class="text-4xl text-white/20">♫</span>
                    </div>
                  }
                >
                  <img
                    src={formatArtworkUrl(pl.attributes.artwork, 300)}
                    alt={pl.attributes?.name}
                    class="w-full h-full object-cover rounded-lg album-shadow-sm"
                  />
                </Show>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); playerStore.playPlaylist(pl.id); }}
                  class="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center"
                  title="Play"
                >
                  <div class="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                    <svg class="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </button>
              </div>
              <p class="text-sm font-medium text-white truncate group-hover:underline">{pl.attributes?.name}</p>
            </A>
            <Show when={pl.attributes?.curatorName}>
              <p class="text-xs text-white/60 truncate">{pl.attributes.curatorName}</p>
            </Show>
          </div>
        )}
      </For>
    </div>
  );

  return (
    <div>
      <Show when={data.error}>
        <div class="bg-red-500/20 border border-red-500/40 rounded-lg p-4">
          <p class="text-red-400">{data.error?.message || 'Failed to load genre'}</p>
        </div>
      </Show>

      <Show
        when={!data.loading && data()}
        fallback={
          <div class="animate-pulse">
            <div class="h-8 w-1/3 bg-surface-secondary rounded mb-6" />
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <For each={Array(10).fill(0)}>
                {() => <div class="aspect-square bg-surface-secondary rounded-lg" />}
              </For>
            </div>
          </div>
        }
      >
        {(g) => (
          <div class="space-y-8">
            <h1 class="text-3xl font-bold text-white">{g().name}</h1>

            <Show
              when={g().albums.length + g().playlists.length + g().songs.length > 0}
              fallback={<p class="text-white/40 py-12 text-center">Nothing charting in this genre right now</p>}
            >
              <Show when={g().albums.length > 0}>
                <section>
                  <h2 class="text-xl font-semibold text-white mb-4">Top Albums</h2>
                  <AlbumGrid items={g().albums} />
                </section>
              </Show>

              <Show when={g().playlists.length > 0}>
                <section>
                  <h2 class="text-xl font-semibold text-white mb-4">Playlists</h2>
                  <PlaylistGrid items={g().playlists} />
                </section>
              </Show>

              <Show when={g().songs.length > 0}>
                <section>
                  <h2 class="text-xl font-semibold text-white mb-4">Top Songs</h2>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                    <For each={g().songs.slice(0, 20)}>
                      {(song, i) => (
                        <button
                          onClick={() => playerStore.playSong(song.id)}
                          class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-smooth group text-left"
                        >
                          <span class="w-5 text-center text-sm text-white/40 flex-shrink-0">{i() + 1}</span>
                          <div class="w-10 h-10 flex-shrink-0">
                            <Show
                              when={song.attributes?.artwork}
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
                          </div>
                          <div class="min-w-0">
                            <p class="text-sm font-medium text-white truncate">{song.attributes?.name}</p>
                            <p class="text-xs text-white/60 truncate">{song.attributes?.artistName}</p>
                          </div>
                        </button>
                      )}
                    </For>
                  </div>
                </section>
              </Show>
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
};

export default GenrePage;
