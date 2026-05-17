import { Component, createResource, For, Show } from 'solid-js';
import { useParams, useNavigate, A } from '@solidjs/router';
import { musicKitStore } from '../../stores/musickit';
import { playerStore } from '../../stores/player';
import { searchAPI } from '../../services/api';
import { formatArtworkUrl } from '../../lib/musickit';
import MusicVideoCard from '../Video/MusicVideoCard';
import MotionArtwork from '../MotionArtwork/MotionArtwork';

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
  similarArtists: any[];
  musicVideos: any[];
  // Extra sections — every one is independently guarded; a failure just
  // yields [] / '' and the section hides. Cannot break the page.
  latestRelease: any[];
  singles: any[];
  appearsOn: any[];
  playlists: any[];
  bio: string;
  editorialVideo: Record<string, any> | null;
}

const ArtistPage: Component = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();


  const navigateToAlbum = async (e: MouseEvent, albumName: string, artistName?: string) => {
    e.stopPropagation();
    const albumId = await searchAPI.findAlbumId(albumName, artistName);
    if (albumId) navigate(`/album/${albumId}`);
  };

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

      const [songsResponse, albumsResponse, similarResponse, videosResponse] = await Promise.all([
        mk.api.music(
          `/v1/catalog/{{storefrontId}}/artists/${id}/view/top-songs`,
          { limit: 10 }
        ),
        mk.api.music(
          `/v1/catalog/{{storefrontId}}/artists/${id}/albums`,
          { limit: 20 }
        ),
        mk.api.music(
          `/v1/catalog/{{storefrontId}}/artists/${id}/similar-artists`,
          { limit: 10 }
        ).catch(() => ({ data: { data: [] } })),
        mk.api.music(
          `/v1/catalog/{{storefrontId}}/artists/${id}/music-videos`,
          { limit: 10 }
        ).catch(() => ({ data: { data: [] } })),
      ]);

      const songsData = songsResponse.data as { data: MusicKit.MediaItem[] };
      const albumsData = albumsResponse.data as { data: MusicKit.MediaItem[] };
      const similarData = similarResponse.data as { data: any[] };
      const videosData = videosResponse.data as { data: any[] };

      // ── Extra sections (additive, each fully guarded) ──────────────────
      // The original 4 requests above already produced a working page.
      // Everything below can only ADD; any failure resolves to []/'' so the
      // section simply hides. Nothing here can throw out of the resource.
      const extraView = (name: string): Promise<any[]> =>
        mk.api
          .music(`/v1/catalog/{{storefrontId}}/artists/${id}/view/${name}`, { limit: 20 })
          .then((r) => ((r.data as { data?: any[] }).data ?? []))
          .catch(() => []);

      const [latestRelease, singles, appearsOn, playlists] = await Promise.all([
        extraView('latest-release'),
        extraView('singles'),
        extraView('appears-on-albums'),
        extraView('featured-playlists'),
      ]);

      let bio = '';
      let editorialVideo: Record<string, any> | null = null;
      try {
        const r = await mk.api.music(`/v1/catalog/{{storefrontId}}/artists/${id}`, {
          extend: 'artistBio,editorialVideo',
        });
        const at = ((r.data as { data?: any[] }).data?.[0]?.attributes ?? {}) as any;
        bio = at.artistBio || at.editorialNotes?.standard || at.editorialNotes?.short || '';
        editorialVideo = at.editorialVideo ?? null;
      } catch {
        // extends unsupported on this storefront — skip silently
      }

      return {
        artist,
        topSongs: songsData.data || [],
        albums: albumsData.data || [],
        similarArtists: similarData.data || [],
        musicVideos: videosData.data || [],
        latestRelease,
        singles,
        appearsOn,
        playlists,
        bio,
        editorialVideo,
      };
    }
  );

  const handlePlaySong = (songId: string) => {
    playerStore.playSong(songId);
  };

  const handlePlayAlbum = (albumId: string) => {
    playerStore.playAlbum(albumId);
  };

  // Shared album grid for the extra sections — same card as "Albums".
  const AlbumGrid = (p: { items: any[] }) => (
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <For each={p.items}>
        {(album) => (
          <div class="group text-left">
            <A href={`/album/${album.id}`} class="block w-full text-left">
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePlayAlbum(album.id);
                  }}
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
              <p class="text-sm font-medium text-white truncate hover:underline">{album.attributes?.name}</p>
            </A>
          </div>
        )}
      </For>
    </div>
  );

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
            {/* Artist Header — full-bleed (cancels main p-6) */}
            <div class="relative -mx-6 -mt-6 h-72 md:h-96 overflow-hidden">
              <Show
                when={artistData().artist.attributes.artwork}
                fallback={
                  <div class="w-full h-full bg-gradient-to-br from-apple-red to-apple-pink flex items-center justify-center">
                    <span class="text-8xl text-white/40">♫</span>
                  </div>
                }
              >
                <MotionArtwork
                  editorialVideo={artistData().editorialVideo}
                  artwork={artistData().artist.attributes.artwork}
                  alt={artistData().artist.attributes.name}
                  size={1200}
                  class="w-full h-full"
                />
              </Show>
              {/* Bottom + side scrim for legibility, blends into page bg */}
              <div class="absolute inset-0 bg-gradient-to-t from-black via-black/55 via-40% to-transparent" />
              <div class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black to-transparent" />
              <div class="absolute bottom-0 left-0 right-0 px-8 pb-7">
                <h1 class="text-5xl md:text-6xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
                  {artistData().artist.attributes.name}
                </h1>
                <Show when={artistData().artist.attributes.genreNames?.length > 0}>
                  <p class="text-white/70 mt-2 text-sm uppercase tracking-wider">
                    {artistData().artist.attributes.genreNames.join(' · ')}
                  </p>
                </Show>
              </div>
            </div>

            {/* About */}
            <Show when={artistData().bio}>
              <section>
                <h2 class="text-xl font-semibold text-white mb-2">About</h2>
                <p class="text-sm text-white/70 leading-relaxed whitespace-pre-line line-clamp-4">
                  {artistData().bio}
                </p>
              </section>
            </Show>

            {/* Latest Release */}
            <Show when={artistData().latestRelease.length > 0}>
              <section>
                <h2 class="text-xl font-semibold text-white mb-4">Latest Release</h2>
                <AlbumGrid items={artistData().latestRelease} />
              </section>
            </Show>

            {/* Top Songs */}
            <Show when={artistData().topSongs.length > 0}>
              <section>
                <h2 class="text-xl font-semibold text-white mb-4">Top Songs</h2>
                <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                  <For each={artistData().topSongs}>
                    {(song, index) => (
                      <button
                        onClick={() => handlePlaySong(song.id)}
                        class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-smooth group text-left"
                      >
                        <span class="w-5 text-center text-sm text-white/40 font-medium flex-shrink-0">
                          {index() + 1}
                        </span>
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
                          <p class="text-sm font-medium text-white truncate">{song.attributes.name}</p>
                          <p
                            class="text-xs text-white/60 truncate hover:text-white hover:underline cursor-pointer"
                            onClick={(e) => navigateToAlbum(e, song.attributes.albumName, song.attributes.artistName)}
                          >{song.attributes.albumName}</p>
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
                <AlbumGrid items={artistData().albums} />
              </section>
            </Show>

            {/* Singles & EPs */}
            <Show when={artistData().singles.length > 0}>
              <section>
                <h2 class="text-xl font-semibold text-white mb-4">Singles &amp; EPs</h2>
                <AlbumGrid items={artistData().singles} />
              </section>
            </Show>

            {/* Appears On */}
            <Show when={artistData().appearsOn.length > 0}>
              <section>
                <h2 class="text-xl font-semibold text-white mb-4">Appears On</h2>
                <AlbumGrid items={artistData().appearsOn} />
              </section>
            </Show>

            {/* Artist Playlists */}
            <Show when={artistData().playlists.length > 0}>
              <section>
                <h2 class="text-xl font-semibold text-white mb-4">Playlists</h2>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <For each={artistData().playlists}>
                    {(pl) => (
                      <A href={`/playlist/${pl.id}`} class="group text-left">
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
                        </div>
                        <p class="text-sm font-medium text-white truncate">{pl.attributes?.name}</p>
                      </A>
                    )}
                  </For>
                </div>
              </section>
            </Show>

            {/* Music Videos */}
            <Show when={artistData().musicVideos.length > 0}>
              <section>
                <h2 class="text-xl font-semibold text-white mb-4">Music Videos</h2>
                <div class="flex gap-4 overflow-x-auto pb-2">
                  <For each={artistData().musicVideos}>
                    {(video, index) => (
                      <MusicVideoCard
                        video={video}
                        allVideoIds={artistData().musicVideos.map((v: any) => v.id)}
                        index={index()}
                      />
                    )}
                  </For>
                </div>
              </section>
            </Show>

            {/* Similar Artists */}
            <Show when={artistData().similarArtists.length > 0}>
              <section>
                <h2 class="text-xl font-semibold text-white mb-4">Similar Artists</h2>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <For each={artistData().similarArtists}>
                    {(artist) => (
                      <A
                        href={`/artist/${artist.id}`}
                        class="group text-center"
                      >
                        <div class="relative w-full aspect-square mb-2">
                          <Show
                            when={artist.attributes?.artwork}
                            fallback={
                              <div class="w-full h-full bg-gradient-to-br from-apple-red to-apple-pink rounded-full flex items-center justify-center">
                                <span class="text-3xl text-white/60">♫</span>
                              </div>
                            }
                          >
                            <img
                              src={formatArtworkUrl(artist.attributes.artwork, 300)}
                              alt={artist.attributes?.name}
                              class="w-full h-full object-cover rounded-full"
                            />
                          </Show>
                        </div>
                        <p class="text-sm font-medium text-white truncate group-hover:underline">
                          {artist.attributes?.name}
                        </p>
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

export default ArtistPage;
