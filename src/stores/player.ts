import { createSignal, createEffect, createRoot, onCleanup } from 'solid-js';
import { musicKitStore } from './musickit';
import { formatArtworkUrl } from '../lib/musickit';
import { updateMediaSessionMetadata } from '../hooks/useMediaKeys';

export type RepeatMode = 'none' | 'one' | 'all';
export type ShuffleMode = 'off' | 'on';

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  nowPlaying: MusicKit.MediaItem | null;
  queue: MusicKit.MediaItem[];
  queuePosition: number;
  shuffleMode: ShuffleMode;
  repeatMode: RepeatMode;
}

export interface PlayerStore {
  state: () => PlayerState;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;
  seekTo: (time: number) => Promise<void>;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setShuffleMode: (mode: ShuffleMode) => void;
  setRepeatMode: (mode: RepeatMode) => void;
  playMedia: (type: string, id: string) => Promise<void>;
  playSong: (songId: string) => Promise<void>;
  playSongs: (songIds: string[], startIndex?: number) => Promise<void>;
  playAlbum: (albumId: string, startPosition?: number) => Promise<void>;
  playPlaylist: (playlistId: string, startPosition?: number) => Promise<void>;
  addToQueue: (songId: string, playNext?: boolean) => Promise<void>;
}

function createPlayerStore(): PlayerStore {
  const [state, setState] = createSignal<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    nowPlaying: null,
    queue: [],
    queuePosition: 0,
    shuffleMode: 'off',
    repeatMode: 'none',
  });

  // Subscribe to MusicKit events when instance is available
  createEffect(() => {
    const mk = musicKitStore.instance();
    if (!mk) return;

    const handlePlaybackStateChange = (event: { state: MusicKit.PlaybackStates }) => {
      setState((prev) => ({
        ...prev,
        isPlaying: event.state === MusicKit.PlaybackStates.playing,
      }));
    };

    const handleNowPlayingChange = (event: { item: MusicKit.MediaItem | null }) => {
      setState((prev) => ({
        ...prev,
        nowPlaying: event.item,
      }));

      // Update MediaSession metadata
      if (event.item) {
        const { name, artistName, albumName, artwork } = event.item.attributes;
        const artworkUrl = artwork ? formatArtworkUrl(artwork, 512) : undefined;
        updateMediaSessionMetadata(name, artistName, albumName, artworkUrl);
      }
    };

    const handleTimeChange = (event: { currentPlaybackTime: number }) => {
      setState((prev) => ({
        ...prev,
        currentTime: event.currentPlaybackTime,
      }));
    };

    const handleDurationChange = (event: { duration: number }) => {
      setState((prev) => ({
        ...prev,
        duration: event.duration,
      }));
    };

    const handleQueueChange = (event: { items: MusicKit.MediaItem[] }) => {
      setState((prev) => ({
        ...prev,
        queue: event.items,
      }));
    };

    const handleVolumeChange = (event: { volume: number }) => {
      setState((prev) => ({
        ...prev,
        volume: event.volume,
      }));
    };

    mk.addEventListener('playbackStateDidChange', handlePlaybackStateChange);
    mk.addEventListener('nowPlayingItemDidChange', handleNowPlayingChange);
    mk.addEventListener('playbackTimeDidChange', handleTimeChange);
    mk.addEventListener('playbackDurationDidChange', handleDurationChange);
    mk.addEventListener('queueItemsDidChange', handleQueueChange);
    mk.addEventListener('playbackVolumeDidChange', handleVolumeChange);

    // Set initial state
    setState((prev) => ({
      ...prev,
      volume: mk.volume,
      nowPlaying: mk.nowPlayingItem,
      isPlaying: mk.playbackState === MusicKit.PlaybackStates.playing,
      shuffleMode: (mk as any).shuffleMode === 1 ? 'on' : 'off',
      repeatMode: getRepeatModeFromMK((mk as any).repeatMode),
    }));

    onCleanup(() => {
      mk.removeEventListener('playbackStateDidChange', handlePlaybackStateChange);
      mk.removeEventListener('nowPlayingItemDidChange', handleNowPlayingChange);
      mk.removeEventListener('playbackTimeDidChange', handleTimeChange);
      mk.removeEventListener('playbackDurationDidChange', handleDurationChange);
      mk.removeEventListener('queueItemsDidChange', handleQueueChange);
      mk.removeEventListener('playbackVolumeDidChange', handleVolumeChange);
    });
  });

  function getRepeatModeFromMK(mode: number): RepeatMode {
    switch (mode) {
      case 1: return 'one';
      case 2: return 'all';
      default: return 'none';
    }
  }

  async function play(): Promise<void> {
    const mk = musicKitStore.instance();
    if (mk) await mk.play();
  }

  async function pause(): Promise<void> {
    const mk = musicKitStore.instance();
    if (mk) await mk.pause();
  }

  async function togglePlayPause(): Promise<void> {
    if (state().isPlaying) {
      await pause();
    } else {
      await play();
    }
  }

  async function skipNext(): Promise<void> {
    const mk = musicKitStore.instance();
    if (mk) await mk.skipToNextItem();
  }

  async function skipPrevious(): Promise<void> {
    const mk = musicKitStore.instance();
    if (mk) await mk.skipToPreviousItem();
  }

  async function seekTo(time: number): Promise<void> {
    const mk = musicKitStore.instance();
    if (mk) await mk.seekToTime(time);
  }

  function setVolume(volume: number): void {
    const mk = musicKitStore.instance();
    if (mk) mk.volume = Math.max(0, Math.min(1, volume));
  }

  function setShuffleMode(mode: ShuffleMode): void {
    const mk = musicKitStore.instance() as any;
    if (mk) {
      mk.shuffleMode = mode === 'on' ? 1 : 0;
      setState((prev) => ({ ...prev, shuffleMode: mode }));
    }
  }

  function toggleShuffle(): void {
    const newMode = state().shuffleMode === 'off' ? 'on' : 'off';
    setShuffleMode(newMode);
  }

  function setRepeatMode(mode: RepeatMode): void {
    const mk = musicKitStore.instance() as any;
    if (mk) {
      const mkMode = mode === 'one' ? 1 : mode === 'all' ? 2 : 0;
      mk.repeatMode = mkMode;
      setState((prev) => ({ ...prev, repeatMode: mode }));
    }
  }

  function toggleRepeat(): void {
    const currentMode = state().repeatMode;
    let newMode: RepeatMode;
    switch (currentMode) {
      case 'none': newMode = 'all'; break;
      case 'all': newMode = 'one'; break;
      case 'one': newMode = 'none'; break;
      default: newMode = 'none';
    }
    setRepeatMode(newMode);
  }

  async function playMedia(type: string, id: string): Promise<void> {
    switch (type) {
      case 'songs':
      case 'library-songs':
        await playSong(id);
        break;
      case 'albums':
      case 'library-albums':
        await playAlbum(id);
        break;
      case 'playlists':
      case 'library-playlists':
        await playPlaylist(id);
        break;
    }
  }

  async function playSong(songId: string): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) return;

    await mk.setQueue({ song: songId });
    await mk.play();
  }

  async function playSongs(songIds: string[], startIndex: number = 0): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) return;

    await mk.setQueue({ songs: songIds, startWith: startIndex });
    await mk.play();
  }

  async function playAlbum(albumId: string, startPosition: number = 0): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) return;

    await mk.setQueue({ album: albumId, startPosition });
    await mk.play();
  }

  async function playPlaylist(playlistId: string, startPosition: number = 0): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) return;

    await mk.setQueue({ playlist: playlistId, startPosition });
    await mk.play();
  }

  async function addToQueue(songId: string, playNext: boolean = false): Promise<void> {
    const mk = musicKitStore.instance() as any;
    if (!mk) return;

    try {
      if (playNext) {
        await mk.playNext({ song: songId });
      } else {
        await mk.playLater({ song: songId });
      }
    } catch (err) {
      console.error('Failed to add to queue:', err);
    }
  }

  return {
    state,
    play,
    pause,
    togglePlayPause,
    skipNext,
    skipPrevious,
    seekTo,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    setShuffleMode,
    setRepeatMode,
    playMedia,
    playSong,
    playSongs,
    playAlbum,
    playPlaylist,
    addToQueue,
  };
}

export const playerStore = createRoot(createPlayerStore);
