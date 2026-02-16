import { Component, createSignal, createResource, createEffect, createMemo, For, Show } from 'solid-js';
import { useParams, A, useNavigate } from '@solidjs/router';
import { musicKitStore } from '../../stores/musickit';
import { playerStore } from '../../stores/player';
import { libraryStore } from '../../stores/library';
import { formatArtworkUrl, formatDuration } from '../../lib/musickit';
import { useContextMenu, createTrackMenuItems } from '../ContextMenu/ContextMenu';
import { copyShareLink } from '../../lib/share';
import { ratingsStore } from '../../stores/ratings';
import HeartButton from '../Rating/HeartButton';

interface PlaylistData {
  id: string;
  type: string;
  attributes: {
    name: string;
    description?: {
      standard?: string;
      short?: string;
    };
    artwork?: {
      url: string;
      width: number;
      height: number;
      bgColor?: string;
    };
    curatorName?: string;
    lastModifiedDate?: string;
    isChart?: boolean;
    playParams?: {
      id: string;
      kind: string;
    };
    canEdit?: boolean;
  };
  relationships?: {
    tracks?: {
      data: TrackData[];
      next?: string;
    };
    curator?: {
      data: { id: string; type: string }[];
    };
  };
}

interface TrackData {
  id: string;
  type: string;
  attributes: {
    name: string;
    artistName: string;
    albumName: string;
    durationInMillis: number;
    artwork?: {
      url: string;
      width: number;
      height: number;
    };
    hasLyrics: boolean;
    isExplicit: boolean;
  };
}

interface PlaylistPageData {
  playlist: PlaylistData;
  initialTracks: TrackData[];
  nextUrl: string | null;
}

const PlaylistPage: Component = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contextMenu = useContextMenu();
  const [tracks, setTracks] = createSignal<TrackData[]>([]);
  const [isLoadingMore, setIsLoadingMore] = createSignal(false);
  const [nextUrl, setNextUrl] = createSignal<string | null>(null);
  const [isInLibrary, setIsInLibrary] = createSignal(false);

  const isLibraryPlaylist = () => params.id?.startsWith('p.');

  const [playlistData] = createResource(
    () => {
      const mk = musicKitStore.instance();
      const id = params.id;
      return mk && id ? { mk, id } : null;
    },
    async ({ mk, id }): Promise<PlaylistPageData> => {
      const endpoint = id.startsWith('p.')
        ? `/v1/me/library/playlists/${id}`
        : `/v1/catalog/{{storefrontId}}/playlists/${id}`;

      const response = await mk.api.music(endpoint, {
        include: 'tracks',
        'limit[tracks]': 100,
      });

      const data = response.data as { data: PlaylistData[] };
      const playlist = data.data?.[0];
      if (!playlist) throw new Error('Playlist not found');

      return {
        playlist,
        initialTracks: playlist.relationships?.tracks?.data || [],
        nextUrl: playlist.relationships?.tracks?.next || null,
      };
    }
  );

  // Sync tracks and nextUrl from resource data
  createEffect(() => {
    const data = playlistData();
    if (data) {
      setTracks(data.initialTracks);
      setNextUrl(data.nextUrl);
    }
  });

  // Check library status when playlist loads
  createEffect(() => {
    const data = playlistData();
    if (!data) return;

    if (isLibraryPlaylist()) {
      setIsInLibrary(true);
    } else if (musicKitStore.isAuthorized()) {
      const mk = musicKitStore.instance();
      if (!mk) return;
      mk.api.music<{ data: unknown[] }>('/v1/me/library/playlists', { 'filter[catalog-id]': params.id })
        .then((res) => {
          setIsInLibrary((res.data?.data?.length ?? 0) > 0);
        })
        .catch(() => {});
    }
  });

  const dominantColor = createMemo(() => {
    const bgColor = playlistData()?.playlist.attributes.artwork?.bgColor;
    return bgColor ? `#${bgColor}` : '#1c1c1e';
  });

  const playlist = () => playlistData()?.playlist ?? null;

  const loadMoreTracks = async () => {
    const mk = musicKitStore.instance();
    const next = nextUrl();
    if (!mk || !next || isLoadingMore()) return;

    setIsLoadingMore(true);
    try {
      const response = await mk.api.music(next);
      const data = response.data as { data: TrackData[]; next?: string };
      setTracks((prev) => [...prev, ...data.data]);
      setNextUrl(data.next || null);
    } catch (err) {
      console.error('Failed to load more tracks:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const totalDuration = () => {
    return tracks().reduce((acc, track) => acc + track.attributes.durationInMillis, 0);
  };

  const formatTotalDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  const handlePlayPlaylist = () => {
    if (playlist()) {
      playerStore.playPlaylist(playlist()!.id);
    }
  };

  const handleShufflePlaylist = async () => {
    const mk = musicKitStore.instance() as any;
    if (!mk || !playlist()) return;

    mk.shuffleMode = 1;
    playerStore.setShuffleMode('on');
    await mk.setQueue({ playlist: playlist()!.id });
    await mk.play();
  };

  const handlePlayTrack = (trackIndex: number) => {
    if (playlist()) {
      playerStore.playPlaylist(playlist()!.id, trackIndex);
    }
  };

  const handleAddToLibrary = async () => {
    const mk = musicKitStore.instance();
    if (!mk || !playlist() || isLibraryPlaylist()) return;

    try {
      await mk.api.music(`/v1/me/library?ids[playlists]=${playlist()!.id}`, {}, {
        fetchOptions: { method: 'POST' }
      });
      setIsInLibrary(true);
      libraryStore.fetchPlaylists();
    } catch (err) {
      console.error('Failed to add to library:', err);
    }
  };

  const currentlyPlayingTrackId = () => playerStore.state().nowPlaying?.id;

  return (
    <div class="pb-8">
      <Show when={playlistData.error}>
        <div class="bg-red-500/20 border border-red-500/40 rounded-lg p-4 mb-6">
          <p class="text-red-400">{playlistData.error?.message || 'Failed to load playlist'}</p>
        </div>
      </Show>

      <Show
        when={!playlistData.loading && playlist()}
        fallback={
          <div class="animate-pulse">
            <div class="flex gap-6 mb-8">
              <div class="w-56 h-56 bg-surface-secondary rounded-lg" />
              <div class="flex-1 pt-4">
                <div class="h-8 bg-surface-secondary rounded-sm w-1/2 mb-3" />
                <div class="h-5 bg-surface-secondary rounded-sm w-1/3 mb-6" />
                <div class="h-4 bg-surface-secondary rounded-sm w-1/4" />
              </div>
            </div>
            <div class="space-y-2">
              <For each={Array(10).fill(0)}>
                {() => (
                  <div class="flex items-center gap-4 p-3">
                    <div class="w-10 h-10 bg-surface-secondary rounded-sm" />
                    <div class="flex-1 h-4 bg-surface-secondary rounded-sm" />
                    <div class="w-12 h-4 bg-surface-secondary rounded-sm" />
                  </div>
                )}
              </For>
            </div>
          </div>
        }
      >
        {(playlistData) => (
          <>
            {/* Playlist Header */}
            <div
              class="relative -mx-6 -mt-6 px-6 pt-6 pb-8 mb-6"
              style={{
                background: `linear-gradient(to bottom, ${dominantColor()}40, transparent)`
              }}
            >
              <div class="flex gap-6">
                {/* Playlist Artwork */}
                <div class="flex-shrink-0">
                  <Show
                    when={playlistData().attributes.artwork}
                    fallback={
                      <div class="w-56 h-56 bg-gradient-to-br from-apple-red to-apple-pink rounded-lg flex items-center justify-center">
                        <span class="text-6xl text-white">♫</span>
                      </div>
                    }
                  >
                    <img
                      src={formatArtworkUrl(playlistData().attributes.artwork, 448)}
                      alt={playlistData().attributes.name}
                      class="w-56 h-56 rounded-lg album-shadow-sm"
                    />
                  </Show>
                </div>

                {/* Playlist Info */}
                <div class="flex-1 flex flex-col justify-end">
                  <p class="text-sm text-white/60 uppercase tracking-wider mb-1">
                    Playlist
                  </p>
                  <h1 class="text-3xl font-bold text-white mb-2">
                    {playlistData().attributes.name}
                  </h1>
                  <Show when={playlistData().attributes.curatorName}>
                    <p class="text-lg text-white/80 mb-2">
                      {playlistData().attributes.curatorName}
                    </p>
                  </Show>
                  <Show when={playlistData().attributes.description?.short}>
                    <p class="text-sm text-white/60 mb-4 max-w-xl">
                      {playlistData().attributes.description?.short}
                    </p>
                  </Show>
                  <div class="flex items-center gap-2 text-sm text-white/60 mb-6">
                    <span>{tracks().length} songs</span>
                    <span>•</span>
                    <span>{formatTotalDuration(totalDuration())}</span>
                  </div>

                  {/* Actions */}
                  <div class="flex items-center gap-3">
                    <button
                      onClick={handlePlayPlaylist}
                      class="flex items-center gap-2 px-6 py-3 bg-apple-red hover:bg-apple-pink text-white font-medium rounded-full transition-smooth"
                    >
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play
                    </button>
                    <button
                      onClick={handleShufflePlaylist}
                      class="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-full transition-smooth"
                    >
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                      </svg>
                      Shuffle
                    </button>
                    <Show when={musicKitStore.isAuthorized() && !isLibraryPlaylist()}>
                      <button
                        onClick={handleAddToLibrary}
                        disabled={isInLibrary()}
                        class={`flex items-center justify-center w-10 h-10 rounded-full transition-smooth ${
                          isInLibrary()
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                        title={isInLibrary() ? 'In Library' : 'Add to Library'}
                      >
                        <Show
                          when={isInLibrary()}
                          fallback={
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                          }
                        >
                          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        </Show>
                      </button>
                    </Show>
                    <button
                      class="flex items-center justify-center w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full transition-smooth"
                      title="More Options"
                      onClick={(e) => {
                        const items: import('../ContextMenu/ContextMenu').MenuItem[] = [];
                        if (!isInLibrary() && !isLibraryPlaylist()) {
                          items.push({
                            id: 'add-to-library',
                            label: 'Add to Library',
                            icon: '+',
                            onClick: handleAddToLibrary,
                          });
                        }
                        items.push({
                          id: 'play-next',
                          label: 'Play Next',
                          icon: '▶',
                          onClick: () => {
                            if (playlist()) playerStore.addToQueue(playlist()!.id, true, 'playlist');
                          },
                        });
                        items.push({
                          id: 'add-to-queue',
                          label: 'Add to Queue',
                          icon: '☰',
                          onClick: () => {
                            if (playlist()) playerStore.addToQueue(playlist()!.id, false, 'playlist');
                          },
                        });
                        items.push({ id: 'divider-1', label: '', divider: true });
                        items.push({
                          id: 'share',
                          label: 'Copy Link',
                          icon: '🔗',
                          onClick: () => copyShareLink(playlist() as any),
                        });
                        contextMenu.show(e.clientX, e.clientY, items);
                      }}
                    >
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Track List */}
            <div class="space-y-1">
              {/* Header */}
              <div class="flex items-center gap-4 px-4 py-2 text-xs text-white/40 uppercase tracking-wider border-b border-white/10">
                <div class="w-8 text-center">#</div>
                <div class="w-10" />
                <div class="flex-1">Title</div>
                <div class="w-48 hidden md:block">Album</div>
                <div class="w-16 text-right">
                  <svg class="w-4 h-4 inline" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                  </svg>
                </div>
              </div>

              {/* Tracks */}
              <For each={tracks()}>
                {(track, index) => {
                  const isPlaying = () => currentlyPlayingTrackId() === track.id;

                  return (
                    <div
                      onClick={() => handlePlayTrack(index())}
                      class={`w-full flex items-center gap-4 px-4 py-2 rounded-lg transition-smooth group cursor-pointer ${
                        isPlaying()
                          ? 'bg-white/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      {/* Track Number */}
                      <div class="w-8 text-center">
                        <Show
                          when={isPlaying()}
                          fallback={
                            <>
                              <span class="text-sm text-white/40 group-hover:hidden">
                                {index() + 1}
                              </span>
                              <svg class="w-4 h-4 text-white hidden group-hover:block mx-auto" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </>
                          }
                        >
                          <div class="flex items-center justify-center gap-0.5">
                            <span class="w-0.5 h-3 bg-apple-red rounded-full animate-pulse" />
                            <span class="w-0.5 h-4 bg-apple-red rounded-full animate-pulse" style={{ "animation-delay": "0.2s" }} />
                            <span class="w-0.5 h-2 bg-apple-red rounded-full animate-pulse" style={{ "animation-delay": "0.4s" }} />
                          </div>
                        </Show>
                      </div>

                      {/* Track Artwork */}
                      <div class="w-10 h-10 flex-shrink-0">
                        <Show
                          when={track.attributes.artwork}
                          fallback={
                            <div class="w-full h-full bg-surface-secondary rounded-sm flex items-center justify-center">
                              <span class="text-white/20 text-xs">♫</span>
                            </div>
                          }
                        >
                          <img
                            src={formatArtworkUrl(track.attributes.artwork, 80)}
                            alt=""
                            class="w-full h-full object-cover rounded-sm"
                          />
                        </Show>
                      </div>

                      {/* Track Info */}
                      <div class="flex-1 min-w-0">
                        <p class={`text-sm font-medium truncate ${isPlaying() ? 'text-apple-red' : 'text-white'}`}>
                          {track.attributes.name}
                          <Show when={track.attributes.isExplicit}>
                            <span class="ml-2 px-1.5 py-0.5 text-[10px] bg-white/20 rounded-sm uppercase">E</span>
                          </Show>
                        </p>
                        <p class="text-xs text-white/60 truncate">
                          {track.attributes.artistName}
                        </p>
                      </div>

                      {/* Album Name */}
                      <div class="w-48 hidden md:block">
                        <p class="text-sm text-white/60 truncate">
                          {track.attributes.albumName}
                        </p>
                      </div>

                      {/* Actions */}
                      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                        <HeartButton type="songs" id={track.id} size="sm" skipFetch />
                        <button
                          class="p-1 text-white/60 hover:text-white"
                          title="More"
                          onClick={(e) => {
                            e.stopPropagation();
                            const items = createTrackMenuItems(track as any, {
                              onPlayNext: () => playerStore.addToQueue(track.id, true, track.type || 'song'),
                              onAddToQueue: () => playerStore.addToQueue(track.id, false, track.type || 'song'),
                              onShare: () => copyShareLink(track as any),
                              onLove: () => ratingsStore.setRating('songs', track.id, 1),
                              onRemoveLove: () => ratingsStore.setRating('songs', track.id, null),
                              isLoved: ratingsStore.getRating('songs', track.id) === 1,
                            });
                            contextMenu.show(e.clientX, e.clientY, items);
                          }}
                        >
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </button>
                      </div>

                      {/* Duration */}
                      <div class="w-16 text-right text-sm text-white/60">
                        {formatDuration(track.attributes.durationInMillis)}
                      </div>
                    </div>
                  );
                }}
              </For>

              {/* Load More */}
              <Show when={nextUrl()}>
                <div class="pt-4 text-center">
                  <button
                    onClick={loadMoreTracks}
                    disabled={isLoadingMore()}
                    class="px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-full transition-smooth disabled:opacity-50"
                  >
                    {isLoadingMore() ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              </Show>
            </div>

            {/* Playlist Footer */}
            <Show when={playlistData().attributes.description?.standard}>
              <div class="mt-8 pt-6 border-t border-white/10">
                <p class="text-sm text-white/60 leading-relaxed">
                  {playlistData().attributes.description?.standard}
                </p>
              </div>
            </Show>
          </>
        )}
      </Show>
    </div>
  );
};

export default PlaylistPage;
