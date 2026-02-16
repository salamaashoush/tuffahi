import { createSignal, createEffect, createRoot, onCleanup } from 'solid-js';
import { musicKitStore } from './musickit';
import { formatArtworkUrl } from '../lib/musickit';
import { updateMediaSessionMetadata, updateMediaSessionPlaybackState, updateMediaSessionPositionState } from '../hooks/useMediaKeys';
import { storageService } from '../services/storage';

export type RepeatMode = 'none' | 'one' | 'all';
export type ShuffleMode = 'off' | 'on';

export interface PlayerState {
  isPlaying: boolean;
  volume: number;
  nowPlaying: MusicKit.MediaItem | null;
  queue: MusicKit.MediaItem[];
  queuePosition: number;
  shuffleMode: ShuffleMode;
  repeatMode: RepeatMode;
}

export interface PlayerStore {
  state: () => PlayerState;
  currentTime: () => number;
  duration: () => number;
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
  addToQueue: (id: string, playNext?: boolean, type?: string) => Promise<void>;
  clearQueueState: () => void;
  syncQueue: () => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => Promise<void>;
}

function createPlayerStore(): PlayerStore {
  const [state, setState] = createSignal<PlayerState>({
    isPlaying: false,
    volume: 1,
    nowPlaying: null,
    queue: [],
    queuePosition: 0,
    shuffleMode: 'off',
    repeatMode: 'none',
  });

  // Separate signals for high-frequency updates — prevents re-rendering
  // the entire player bar, queue, etc. on every time tick (~4x/sec).
  const [currentTime, setCurrentTime] = createSignal(0);
  const [duration, setDuration] = createSignal(0);

  // Lock to prevent concurrent play operations (double-click → multiple streams)
  let playLock = false;

  // Subscribe to MusicKit events when instance is available
  createEffect(() => {
    const mk = musicKitStore.instance();
    if (!mk) return;

    const handlePlaybackStateChange = (event: { state: MusicKit.PlaybackStates }) => {
      const isPlaying = event.state === MusicKit.PlaybackStates.playing;
      setState((prev) => ({ ...prev, isPlaying }));
      updateMediaSessionPlaybackState(isPlaying);
      // Release play lock once playback actually starts or stops
      if (isPlaying) playLock = false;
    };

    const handleNowPlayingChange = (event: { item: MusicKit.MediaItem | null }) => {
      setState((prev) => ({ ...prev, nowPlaying: event.item }));

      // Update MediaSession metadata and record play history
      if (event.item?.attributes) {
        const { name, artistName, albumName, artwork, durationInMillis } = event.item.attributes;
        const artworkUrl = artwork ? formatArtworkUrl(artwork, 512) : undefined;
        updateMediaSessionMetadata(name, artistName ?? '', albumName ?? '', artworkUrl);

        // Record to local play history with metadata
        storageService.addToPlayHistory({
          id: event.item.id,
          type: event.item.type,
          name,
          artistName: artistName ?? '',
          artworkUrl: artworkUrl ?? '',
          durationMs: durationInMillis,
        });
      }
    };

    const handleTimeChange = (event: { currentPlaybackTime: number }) => {
      setCurrentTime(event.currentPlaybackTime);
      const dur = duration();
      if (dur > 0) {
        updateMediaSessionPositionState(dur, event.currentPlaybackTime);
      }
    };

    const handleDurationChange = (event: { duration: number }) => {
      setDuration(event.duration);
      if (event.duration > 0) {
        updateMediaSessionPositionState(event.duration, currentTime());
      }
    };

    const handleQueueChange = (event: { items: MusicKit.MediaItem[] }) => {
      if (skipNextQueueSync) {
        skipNextQueueSync = false;
        return;
      }
      const items = (event.items || []).filter((item) => item != null);
      setState((prev) => ({ ...prev, queue: items }));
    };

    const handleVolumeChange = (event: { volume: number }) => {
      // Ignore MusicKit's volume events for 500ms after we set volume ourselves.
      // MusicKit fires async events that race with our setState and overwrite it.
      if (Date.now() - lastVolumeSetAt < 500) return;
      setState((prev) => ({ ...prev, volume: event.volume }));
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

    // Apply autoplay setting from localStorage
    try {
      const savedSettings = localStorage.getItem('app-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.autoplay !== undefined) {
          (mk as any).autoplayEnabled = parsed.autoplay;
        }
      }
    } catch {
      // Ignore parse errors
    }

    // Restore last played song so the player bar shows it on startup
    if (!mk.nowPlayingItem) {
      restoreLastPlayed(mk);
    }

    onCleanup(() => {
      mk.removeEventListener('playbackStateDidChange', handlePlaybackStateChange);
      mk.removeEventListener('nowPlayingItemDidChange', handleNowPlayingChange);
      mk.removeEventListener('playbackTimeDidChange', handleTimeChange);
      mk.removeEventListener('playbackDurationDidChange', handleDurationChange);
      mk.removeEventListener('queueItemsDidChange', handleQueueChange);
      mk.removeEventListener('playbackVolumeDidChange', handleVolumeChange);
    });
  });

  // Expose player commands on window so the main process can call them
  // via executeJavaScript (from mini player, tray, etc.) — no IPC listeners
  // means no stacking, no HMR duplication, no races.
  (window as any).__playerCommand = async (command: string) => {
    try {
      switch (command) {
        case 'togglePlayPause': await togglePlayPause(); break;
        case 'skipNext': await skipNext(); break;
        case 'skipPrevious': await skipPrevious(); break;
      }
    } catch (err) {
      console.error('[Player] command failed:', command, err);
    }
  };

  function getRepeatModeFromMK(mode: number): RepeatMode {
    switch (mode) {
      case 1: return 'one';
      case 2: return 'all';
      default: return 'none';
    }
  }

  // Lock to prevent rapid-fire skip commands (mini player / tray / media keys)
  let skipLock = false;

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
    if (skipLock) return;
    const mk = musicKitStore.instance();
    if (!mk) return;
    skipLock = true;
    try {
      await mk.skipToNextItem();
    } finally {
      setTimeout(() => { skipLock = false; }, 300);
    }
  }

  async function skipPrevious(): Promise<void> {
    if (skipLock) return;
    const mk = musicKitStore.instance();
    if (!mk) return;
    skipLock = true;
    try {
      await mk.skipToPreviousItem();
    } finally {
      setTimeout(() => { skipLock = false; }, 300);
    }
  }

  async function seekTo(time: number): Promise<void> {
    const mk = musicKitStore.instance();
    if (mk) await mk.seekToTime(time);
  }

  // Timestamp of last programmatic volume change — used to suppress
  // MusicKit's async playbackVolumeDidChange events that race with us.
  let lastVolumeSetAt = 0;

  function setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    lastVolumeSetAt = Date.now();
    setState((prev) => ({ ...prev, volume: clamped }));
    const mk = musicKitStore.instance();
    if (mk) mk.volume = clamped;
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

  /**
   * Start playback, guarded by playLock to prevent concurrent play operations.
   * Resets time/duration immediately for instant UI feedback.
   */
  async function startPlayback(
    queueSetter: (mk: MusicKit.MusicKitInstance) => Promise<void>,
    mk: MusicKit.MusicKitInstance
  ): Promise<void> {
    if (playLock) return;
    playLock = true;

    // Immediate UI feedback: reset time so progress bar clears
    setCurrentTime(0);
    setDuration(0);

    try {
      await queueSetter(mk);
    } catch (err) {
      playLock = false;
      throw err;
    }
    // playLock is released in handlePlaybackStateChange when playback starts
    // Safety timeout in case the event never fires
    setTimeout(() => { playLock = false; }, 5000);
  }

  async function playStation(stationId: string): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) return;

    await startPlayback(async (m) => {
      await m.setQueue({ station: stationId });
      await m.play();
    }, mk);
  }

  async function playMedia(type: string, id: string): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) return;

    console.log('[Player] playMedia:', type, id);

    try {
      switch (type) {
        case 'songs':
        case 'library-songs':
        case 'music-videos':
          await startPlayback(async (m) => {
            await m.setQueue({ [type.startsWith('library') ? 'songs' : 'song']: id });
            await m.play();
          }, mk);
          break;
        case 'albums':
        case 'library-albums':
          await playAlbum(id);
          break;
        case 'playlists':
        case 'library-playlists':
          await playPlaylist(id);
          break;
        case 'stations':
        case 'station':
        case 'personal-station':
        case 'radioStations':
          await playStation(id);
          break;
        default:
          if (type.toLowerCase().includes('station') || type.toLowerCase().includes('radio')) {
            console.warn('[Player] Unknown station-like type:', type, id);
            await playStation(id);
          } else {
            console.warn('[Player] Unknown type, trying as song:', type, id);
            await startPlayback(async (m) => {
              await m.setQueue({ song: id });
              await m.play();
            }, mk);
          }
          break;
      }
    } catch (err) {
      console.error('[Player] playMedia failed:', err);
    }
  }

  async function playSong(songId: string): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) return;

    try {
      await startPlayback(async (m) => {
        await m.setQueue({ song: songId });
        await m.play();
      }, mk);
    } catch (err) {
      console.error('[Player] playSong failed:', songId, err);
    }
  }

  async function playSongs(songIds: string[], startIndex: number = 0): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) return;

    await startPlayback(async (m) => {
      await m.setQueue({ songs: songIds, startWith: startIndex });
      await m.play();
    }, mk);
  }

  async function playAtIndex(mk: MusicKit.MusicKitInstance, startIndex: number): Promise<void> {
    if (startIndex > 0) {
      try {
        await mk.changeToMediaAtIndex(startIndex);
      } catch {
        await mk.play();
      }
    } else {
      await mk.play();
    }
  }

  async function playAlbum(albumId: string, startIndex: number = 0): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) return;

    try {
      await startPlayback(async (m) => {
        await m.setQueue({ album: albumId });
        await playAtIndex(m, startIndex);
      }, mk);
    } catch (err) {
      console.error('[Player] playAlbum failed:', err);
    }
  }

  async function playPlaylist(playlistId: string, startIndex: number = 0): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) return;

    try {
      await startPlayback(async (m) => {
        await m.setQueue({ playlist: playlistId });
        await playAtIndex(m, startIndex);
      }, mk);
    } catch (err) {
      console.error('[Player] playPlaylist failed:', err);
    }
  }

  // Flag to skip the next queueItemsDidChange event (after manual remove/reorder)
  let skipNextQueueSync = false;

  function syncQueue(): void {
    // Small delay to let MusicKit update its internal queue
    setTimeout(() => {
      if (skipNextQueueSync) {
        skipNextQueueSync = false;
        return;
      }
      const mk = musicKitStore.instance() as any;
      if (!mk) return;
      const items = mk.queue?.items || [];
      const validItems = Array.from(items).filter((item: any) => item != null);
      setState((prev) => ({ ...prev, queue: validItems }));
    }, 50);
  }

  async function addToQueue(id: string, playNext: boolean = false, type: string = 'song'): Promise<void> {
    const mk = musicKitStore.instance() as any;
    if (!mk) return;

    let descriptor: Record<string, string>;
    switch (type) {
      case 'songs':
      case 'library-songs':
      case 'song':
        descriptor = { song: id };
        break;
      case 'albums':
      case 'library-albums':
      case 'album':
        descriptor = { album: id };
        break;
      case 'playlists':
      case 'library-playlists':
      case 'playlist':
        descriptor = { playlist: id };
        break;
      default:
        descriptor = { song: id };
    }

    try {
      if (!mk.nowPlayingItem) {
        console.log('[Player] No queue active, starting playback for', type, id);
        await mk.setQueue(descriptor);
        await mk.play();
        syncQueue();
        return;
      }

      if (playNext) {
        await mk.playNext(descriptor);
        console.log('[Player] Play next:', type, id);
      } else {
        await mk.playLater(descriptor);
        console.log('[Player] Play later:', type, id);
      }
      syncQueue();
    } catch (err) {
      console.error('[Player] addToQueue failed:', type, id, err);
      try {
        await mk.setQueue(descriptor);
        await mk.play();
        syncQueue();
      } catch (fallbackErr) {
        console.error('[Player] Fallback playback also failed:', fallbackErr);
      }
    }
  }

  function clearQueueState(): void {
    setState((prev) => ({
      ...prev,
      queue: [],
      queuePosition: 0,
      nowPlaying: null,
      isPlaying: false,
    }));
    setCurrentTime(0);
    setDuration(0);
  }

  function removeFromQueue(index: number): void {
    const mk = musicKitStore.instance() as any;
    if (!mk) return;

    const currentQueue = state().queue;
    if (index < 0 || index >= currentQueue.length) return;

    const newQueue = [...currentQueue];
    newQueue.splice(index, 1);
    skipNextQueueSync = true;
    setState((prev) => ({ ...prev, queue: newQueue }));

    if (mk.queue && typeof mk.queue.remove === 'function') {
      try {
        mk.queue.remove(index);
        console.log('[Player] queue.remove succeeded for index', index);
      } catch (err) {
        console.error('[Player] queue.remove failed:', err);
      }
    }
  }

  async function reorderQueue(fromIndex: number, toIndex: number): Promise<void> {
    const currentQueue = state().queue;
    if (!currentQueue.length || fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= currentQueue.length) return;
    if (toIndex < 0 || toIndex >= currentQueue.length) return;

    const newQueue = [...currentQueue];
    const [moved] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, moved);

    skipNextQueueSync = true;
    setState((prev) => ({ ...prev, queue: newQueue }));
    console.log('[Player] Queue reordered (local state)');
  }

  async function restoreLastPlayed(mk: MusicKit.MusicKitInstance): Promise<void> {
    try {
      const history = await storageService.getPlayHistory();
      if (history.length === 0) return;

      const last = history[0];
      const queueKey = last.type.startsWith('library') ? 'songs' : 'song';
      await mk.setQueue({ [queueKey]: last.id });
      // setQueue populates nowPlayingItem without starting playback
      console.log('[Player] Restored last played:', last.name);
    } catch (err) {
      console.warn('[Player] Failed to restore last played:', err);
    }
  }

  return {
    state,
    currentTime,
    duration,
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
    clearQueueState,
    syncQueue,
    removeFromQueue,
    reorderQueue,
  };
}

export const playerStore = createRoot(createPlayerStore);
