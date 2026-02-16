import { Component, createResource, For, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import { musicKitStore } from '../../stores/musickit';
import { playerStore } from '../../stores/player';
import { formatArtworkUrl } from '../../lib/musickit';

interface ArtistData {
  id: string;
  attributes: {
    name: string;
    artwork?: {
      url: string;
      width: number;
      height: number;
    };
    genreNames: string[];
  };
}

interface ArtistDetails {
  artist: ArtistData;
  topSongs: MusicKit.MediaItem[];
  albums: MusicKit.MediaItem[];
}

const ArtistPage: Component = () => {
  const params = useParams<{ id: string }>();

  const [data] = createResource(
    () => {
      const mk = musicKitStore.instance();
      const id = params.id;
      return mk && id ? { mk, id } : null;
    },
    async ({ mk, id }): Promise<ArtistDetails> => {
      const artistResponse = await mk.api.music(
        `/v1/catalog/{{storefrontId}}/artists/${id}`,
        { include: 'albums' }
      );

      const artistData = artistResponse.data as { data: ArtistData[] };
      const artist = artistData.data?.[0];
      if (!artist) throw new Error('Artist not found');

      const [songsResponse, albumsResponse] = await Promise.all([
        mk.api.music(
          `/v1/catalog/{{storefrontId}}/artists/${id}/view/top-songs`,
          { limit: 10 }
        ),
        mk.api.music(
          `/v1/catalog/{{storefrontId}}/artists/${id}/albums`,
          { limit: 20 }
        ),
      ]);

      const songsData = songsResponse.data as { data: MusicKit.MediaItem[] };
      const albumsData = albumsResponse.data as { data: MusicKit.MediaItem[] };

      return {
        artist,
        topSongs: songsData.data || [],
        albums: albumsData.data || [],
      };
    }
  );

  const handlePlaySong = (songId: string) => {
    playerStore.playSong(songId);
  };

  const handlePlayAlbum = (albumId: string) => {
    playerStore.playAlbum(albumId);
  };

  return (
    <div>
      <Show when={data.error}>
        <div class="bg-red-500/20 border border-red-500/40 rounded-lg p-4">
          <p class="text-red-400">{data.error?.message || 'Failed to load artist'}</p>
        </div>
      </Show>

      <Show
        when={!data.loading && data()}
        fallback={
          <div class="animate-pulse">
            <div class="h-48 bg-surface-secondary rounded-xl mb-6" />
            <div class="h-8 bg-surface-secondary rounded-sm w-1/3 mb-8" />
            <div class="space-y-2">
              <For each={Array(5).fill(0)}>
                {() => (
                  <div class="flex items-center gap-3 p-2">
                    <div class="w-12 h-12 bg-surface-secondary rounded-sm" />
                    <div class="flex-1">
                      <div class="h-4 bg-surface-secondary rounded-sm w-1/3 mb-1" />
                      <div class="h-3 bg-surface-secondary rounded-sm w-1/4" />
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        }
      >
        {(artistData) => (
          <div class="space-y-8">
            {/* Artist Header */}
            <div class="relative h-64 rounded-xl overflow-hidden">
              <Show
                when={artistData().artist.attributes.artwork}
                fallback={
                  <div class="w-full h-full bg-gradient-to-br from-apple-red to-apple-pink flex items-center justify-center">
                    <span class="text-8xl text-white/40">♫</span>
                  </div>
                }
              >
                <img
                  src={formatArtworkUrl(artistData().artist.attributes.artwork, 800)}
                  alt={artistData().artist.attributes.name}
                  class="w-full h-full object-cover"
                />
              </Show>
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div class="absolute bottom-0 left-0 p-6">
                <h1 class="text-4xl font-bold text-white mb-2">
                  {artistData().artist.attributes.name}
                </h1>
                <Show when={artistData().artist.attributes.genreNames?.length > 0}>
                  <p class="text-white/60">
                    {artistData().artist.attributes.genreNames.join(', ')}
                  </p>
                </Show>
              </div>
            </div>

            {/* Top Songs */}
            <Show when={artistData().topSongs.length > 0}>
              <section>
                <h2 class="text-xl font-semibold text-white mb-4">Top Songs</h2>
                <div class="space-y-1">
                  <For each={artistData().topSongs}>
                    {(song, index) => (
                      <button
                        onClick={() => handlePlaySong(song.id)}
                        class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-smooth group text-left"
                      >
                        <span class="w-6 text-center text-sm text-white/40 font-medium">
                          {index() + 1}
                        </span>
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
                          <p class="text-xs text-white/60 truncate">{song.attributes.albumName}</p>
                        </div>
                      </button>
                    )}
                  </For>
                </div>
              </section>
            </Show>

            {/* Albums */}
            <Show when={artistData().albums.length > 0}>
              <section>
                <h2 class="text-xl font-semibold text-white mb-4">Albums</h2>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <For each={artistData().albums}>
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
                      </button>
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

export default ArtistPage;
