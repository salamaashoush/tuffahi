import { Component, createSignal, createResource, createEffect, createMemo, For, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { musicKitStore } from '../../stores/musickit';
import { playerStore } from '../../stores/player';
import { libraryStore } from '../../stores/library';
import { formatArtworkUrl, formatDuration } from '../../lib/musickit';
import { useContextMenu, createTrackMenuItems } from '../ContextMenu/ContextMenu';
import { copyShareLink } from '../../lib/share';
import { ratingsStore } from '../../stores/ratings';
import HeartButton from '../Rating/HeartButton';
import QualityBadge from '../QualityBadge/QualityBadge';

interface AlbumData {
  id: string;
  type: string;
  attributes: {
    name: string;
    artistName: string;
    artwork?: {
      url: string;
      width: number;
      height: number;
      bgColor?: string;
    };
    releaseDate: string;
    trackCount: number;
    genreNames: string[];
    copyright?: string;
    editorialNotes?: {
      short?: string;
      standard?: string;
    };
    isComplete: boolean;
    isSingle: boolean;
    recordLabel?: string;
  };
  relationships?: {
    tracks?: {
      data: TrackData[];
    };
    artists?: {
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
    trackNumber: number;
    discNumber: number;
    durationInMillis: number;
    artwork?: {
      url: string;
      width: number;
      height: number;
    };
    hasLyrics: boolean;
    isExplicit: boolean;
    previews?: { url: string }[];
  };
}

const AlbumPage: Component = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contextMenu = useContextMenu();
  const [isInLibrary, setIsInLibrary] = createSignal(false);

  const isLibraryAlbum = () => params.id?.startsWith('l.');

  const [album] = createResource(
    () => {
      const mk = musicKitStore.instance();
      const id = params.id;
      return mk && id ? { mk, id } : null;
    },
    async ({ mk, id }): Promise<AlbumData> => {
      const endpoint = id.startsWith('l.')
        ? `/v1/me/library/albums/${id}`
        : `/v1/catalog/{{storefrontId}}/albums/${id}`;

      const response = await mk.api.music(endpoint, {
        include: 'tracks,artists',
      });

      const data = response.data as { data: AlbumData[] };
      const albumData = data.data?.[0];
      if (!albumData) throw new Error('Album not found');
      return albumData;
    }
  );

  // Check library status when album loads
  createEffect(() => {
    const albumData = album();
    if (!albumData) return;

    if (isLibraryAlbum()) {
      setIsInLibrary(true);
    } else if (musicKitStore.isAuthorized()) {
      const mk = musicKitStore.instance();
      if (!mk) return;
      mk.api.music<{ data: unknown[] }>('/v1/me/library/albums', { 'filter[catalog-id]': params.id })
        .then((res) => {
          setIsInLibrary((res.data?.data?.length ?? 0) > 0);
        })
        .catch(() => {});
    }
  });

  const dominantColor = createMemo(() => {
    const bgColor = album()?.attributes.artwork?.bgColor;
    return bgColor ? `#${bgColor}` : '#1c1c1e';
  });

  const tracks = () => album()?.relationships?.tracks?.data || [];

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

  const handlePlayAlbum = () => {
    if (album()) {
      playerStore.playAlbum(album()!.id);
    }
  };

  const handleShuffleAlbum = async () => {
    const mk = musicKitStore.instance() as any;
    if (!mk || !album()) return;

    mk.shuffleMode = 1;
    playerStore.setShuffleMode('on');
    await mk.setQueue({ album: album()!.id });
    await mk.play();
  };

  const handlePlayTrack = (trackIndex: number) => {
    if (album()) {
      playerStore.playAlbum(album()!.id, trackIndex);
    }
  };

  const handleAddToLibrary = async () => {
    const mk = musicKitStore.instance();
    if (!mk || !album() || isLibraryAlbum()) return;

    try {
      await mk.api.music(`/v1/me/library?ids[albums]=${album()!.id}`, {}, {
        fetchOptions: { method: 'POST' }
      });
      setIsInLibrary(true);
      libraryStore.fetchAlbums();
    } catch (err) {
      console.error('Failed to add to library:', err);
    }
  };

  const currentlyPlayingTrackId = () => playerStore.state().nowPlaying?.id;

  return (
    <div class="pb-8">
      <Show when={album.error}>
        <div class="bg-red-500/20 border border-red-500/40 rounded-lg p-4 mb-6">
          <p class="text-red-400">{album.error?.message || 'Failed to load album'}</p>
        </div>
      </Show>

      <Show
        when={!album.loading && album()}
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
                    <div class="w-6 h-4 bg-surface-secondary rounded-sm" />
                    <div class="flex-1 h-4 bg-surface-secondary rounded-sm" />
                    <div class="w-12 h-4 bg-surface-secondary rounded-sm" />
                  </div>
                )}
              </For>
            </div>
          </div>
        }
      >
        {(albumData) => (
          <>
            {/* Album Header */}
            <div
              class="relative -mx-6 -mt-6 px-6 pt-6 pb-8 mb-6"
              style={{
                background: `linear-gradient(to bottom, ${dominantColor()}40, transparent)`
              }}
            >
              <div class="flex gap-6">
                {/* Album Artwork */}
                <div class="flex-shrink-0">
                  <Show
                    when={albumData().attributes.artwork}
                    fallback={
                      <div class="w-56 h-56 bg-surface-secondary rounded-lg flex items-center justify-center">
                        <span class="text-6xl text-white/20">♫</span>
                      </div>
                    }
                  >
                    <img
                      src={formatArtworkUrl(albumData().attributes.artwork, 448)}
                      alt={albumData().attributes.name}
                      class="w-56 h-56 rounded-lg album-shadow-sm"
                    />
                  </Show>
                </div>

                {/* Album Info */}
                <div class="flex-1 flex flex-col justify-end">
                  <p class="text-sm text-white/60 uppercase tracking-wider mb-1">
                    {albumData().attributes.isSingle ? 'Single' : 'Album'}
                  </p>
                  <h1 class="text-3xl font-bold text-white mb-2">
                    {albumData().attributes.name}
                  </h1>
                  <p class="text-xl text-white/80 mb-4">
                    {albumData().attributes.artistName}
                  </p>
                  <div class="flex items-center gap-2 text-sm text-white/60 mb-6">
                    <span>{albumData().attributes.genreNames?.[0]}</span>
                    <span>•</span>
                    <span>{new Date(albumData().attributes.releaseDate).getFullYear()}</span>
                    <span>•</span>
                    <span>{albumData().attributes.trackCount} songs, {formatTotalDuration(totalDuration())}</span>
                  </div>

                  {/* Actions */}
                  <div class="flex items-center gap-3">
                    <button
                      onClick={handlePlayAlbum}
                      class="flex items-center gap-2 px-6 py-3 bg-apple-red hover:bg-apple-pink text-white font-medium rounded-full transition-smooth"
                    >
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play
                    </button>
                    <button
                      onClick={handleShuffleAlbum}
                      class="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-full transition-smooth"
                    >
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                      </svg>
                      Shuffle
                    </button>
                    <Show when={musicKitStore.isAuthorized() && !isLibraryAlbum()}>
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
                        if (!isInLibrary() && !isLibraryAlbum()) {
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
                            if (album()) playerStore.addToQueue(album()!.id, true, 'album');
                          },
                        });
                        items.push({
                          id: 'add-to-queue',
                          label: 'Add to Queue',
                          icon: '☰',
                          onClick: () => {
                            if (album()) playerStore.addToQueue(album()!.id, false, 'album');
                          },
                        });
                        if (albumData().attributes.artwork) {
                          items.push({ id: 'divider-1', label: '', divider: true });
                          items.push({
                            id: 'share',
                            label: 'Copy Link',
                            icon: '🔗',
                            onClick: () => copyShareLink(albumData() as any),
                          });
                        }
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
                <div class="flex-1">Title</div>
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
                      class={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-smooth group cursor-pointer ${
                        isPlaying()
                          ? 'bg-white/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      {/* Track Number / Playing Indicator */}
                      <div class="w-8 text-center">
                        <Show
                          when={isPlaying()}
                          fallback={
                            <>
                              <span class="text-sm text-white/40 group-hover:hidden">
                                {track.attributes.trackNumber}
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

                      {/* Track Info */}
                      <div class="flex-1 min-w-0">
                        <p class={`text-sm font-medium truncate ${isPlaying() ? 'text-apple-red' : 'text-white'}`}>
                          {track.attributes.name}
                          <Show when={track.attributes.isExplicit}>
                            <span class="ml-2 px-1.5 py-0.5 text-[10px] bg-white/20 rounded-sm uppercase">E</span>
                          </Show>
                        </p>
                        <Show when={track.attributes.artistName !== albumData().attributes.artistName}>
                          <p class="text-xs text-white/60 truncate">
                            {track.attributes.artistName}
                          </p>
                        </Show>
                      </div>

                      {/* Actions (show on hover) */}
                      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                        <HeartButton type="songs" id={track.id} size="sm" skipFetch />
                        <button
                          class="p-1 text-white/60 hover:text-white"
                          title="More Options"
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
            </div>

            {/* Album Footer Info */}
            <div class="mt-8 pt-6 border-t border-white/10">
              <Show when={albumData().attributes.editorialNotes?.standard}>
                <p class="text-sm text-white/60 mb-4 leading-relaxed">
                  {albumData().attributes.editorialNotes?.standard}
                </p>
              </Show>
              <div class="text-xs text-white/40 space-y-1">
                <p>{new Date(albumData().attributes.releaseDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
                <Show when={albumData().attributes.recordLabel}>
                  <p>{albumData().attributes.recordLabel}</p>
                </Show>
                <Show when={albumData().attributes.copyright}>
                  <p>{albumData().attributes.copyright}</p>
                </Show>
              </div>
            </div>
          </>
        )}
      </Show>
    </div>
  );
};

export default AlbumPage;
