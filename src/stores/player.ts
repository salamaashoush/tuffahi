import { createSignal, createEffect, createRoot, onCleanup } from 'solid-js';
import { musicKitStore } from './musickit';
import { formatArtworkUrl } from '../lib/musickit';
import { updateMediaSessionMetadata, updateMediaSessionPlaybackState, updateMediaSessionPositionState } from '../hooks/useMediaKeys';
import { storageService } from '../services/storage';

export type RepeatMode = 'none' | 'one' | 'all';
export type ShuffleMode = 'off' | 'on';

export interface PlayerState {
  isPlaying: boolean;
  /** True between a play request and audio actually starting (DRM/network). */
  isLoading: boolean;
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
  playbackRate: () => number;
  isVideoPlaying: () => boolean;
  setPlaybackRate: (rate: number) => void;
  setVideoContainer: (el: HTMLDivElement | null) => void;
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
  playMedia: (type: string, id: string, item?: MusicKit.MediaItem) => Promise<void>;
  playMusicVideos: (videoIds: string[], startIndex?: number) => Promise<void>;
  playSong: (songId: string, item?: MusicKit.MediaItem) => Promise<void>;
  playSongs: (songIds: string[], startIndex?: number) => Promise<void>;
  playAlbum: (albumId: string, startPosition?: number, item?: MusicKit.MediaItem) => Promise<void>;
  playPlaylist: (playlistId: string, startPosition?: number, item?: MusicKit.MediaItem) => Promise<void>;
  stopVideo: () => void;
  addToQueue: (id: string, playNext?: boolean, type?: string) => Promise<void>;
  clearQueueState: () => void;
  syncQueue: () => void;
  removeFromQueue: (index: number) => Promise<void>;
  reorderQueue: (fromIndex: number, toIndex: number) => Promise<void>;
}

const VOLUME_KEY = 'player-volume';

function readPersistedVolume(): number {
  try {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? '1');
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
  } catch {
    return 1;
  }
}

function createPlayerStore(): PlayerStore {
  const persistedVolume = readPersistedVolume();

  const [state, setState] = createSignal<PlayerState>({
    isPlaying: false,
    isLoading: false,
    volume: persistedVolume,
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
  const [playbackRate, setPlaybackRateSignal] = createSignal(
    (() => { try { return parseFloat(localStorage.getItem('playback-rate') || '1') || 1; } catch { return 1; } })()
  );
  const [isVideoPlaying, setIsVideoPlaying] = createSignal(false);
  let videoContainerEl: HTMLDivElement | null = null;
  // Timestamp when video mode was activated — protects against MusicKit
  // firing nowPlayingItemDidChange(null) during queue transition
  let videoStartedAt = 0;

  function setVideoContainer(el: HTMLDivElement | null) {
    videoContainerEl = el;
    const mk = musicKitStore.instance();
    if (mk && el) {
      mk.videoContainerElement = el;
    }
  }

  function stopVideo() {
    videoStartedAt = 0; // Clear grace period so close is immediate
    setIsVideoPlaying(false);
    const mk = musicKitStore.instance();
    if (mk) mk.stop();
  }

  // Play requests are token-based, not a hard lock. A new request for a
  // DIFFERENT target supersedes an in-flight one (so clicks during the
  // 1–3s DRM/network load aren't silently dropped). Identical rapid
  // double-clicks on the SAME target are deduped.
  let playToken = 0;
  let lastPlayKey = '';
  let lastPlayAt = 0;

  // Subscribe to MusicKit events when instance is available
  createEffect(() => {
    const mk = musicKitStore.instance();
    if (!mk) return;

    // Set video container on MusicKit instance if already available
    if (videoContainerEl) {
      mk.videoContainerElement = videoContainerEl;
    }

    const handlePlaybackStateChange = (event: { state: MusicKit.PlaybackStates }) => {
      const isPlaying = event.state === MusicKit.PlaybackStates.playing;
      // Audio is actually running → loading is over.
      setState((prev) => ({ ...prev, isPlaying, isLoading: isPlaying ? false : prev.isLoading }));
      updateMediaSessionPlaybackState(isPlaying);
      // Snapshot session on pause/stop so the offset survives a restart.
      if (!isPlaying) persistSession(true);
    };

    const handleNowPlayingChange = (event: { item: MusicKit.MediaItem | null }) => {
      setState((prev) => ({ ...prev, nowPlaying: event.item }));

      // Determine if the new item is a music video
      const itemType = event.item?.type || '';
      const isVideoItem = itemType.includes('music-video') || itemType.includes('musicVideo');
      const withinGracePeriod = (Date.now() - videoStartedAt) < 5000;

      if (isVideoPlaying()) {
        if (isVideoItem) {
          videoStartedAt = Date.now();
        } else if (!withinGracePeriod) {
          // A non-video track genuinely started — close video overlay
          setIsVideoPlaying(false);
        }
      } else if (isVideoItem) {
        // Not in video mode but a video item started (e.g. next in queue is a video)
        videoStartedAt = Date.now();
        setIsVideoPlaying(true);
      }

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
      persistSession(); // throttled (~5s) — keeps resume offset fresh
    };

    const handleDurationChange = (event: { duration: number }) => {
      setDuration(event.duration);
      if (event.duration > 0) {
        updateMediaSessionPositionState(event.duration, currentTime());
      }
    };

    // MusicKit is the source of truth for the queue. Mirror its items
    // verbatim — no optimistic local splices, no suppression flags.
    const handleQueueChange = (event: { items: MusicKit.MediaItem[] }) => {
      const items = (event.items || []).filter((item) => item != null);
      setState((prev) => ({ ...prev, queue: items }));
      persistSession(true);
    };

    const handleQueuePositionChange = (event: { position: number; item: MusicKit.MediaItem | null }) => {
      setState((prev) => ({
        ...prev,
        queuePosition: event.position,
        ...(event.item ? { nowPlaying: event.item } : {}),
      }));
      persistSession(true);
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
    mk.addEventListener('queuePositionDidChange', handleQueuePositionChange);
    mk.addEventListener('playbackVolumeDidChange', handleVolumeChange);

    // Apply the persisted volume to MusicKit (its default is 1).
    mk.volume = persistedVolume;

    // Set initial state
    setState((prev) => ({
      ...prev,
      volume: persistedVolume,
      nowPlaying: mk.nowPlayingItem,
      isPlaying: mk.playbackState === MusicKit.PlaybackStates.playing,
      queue: Array.from(mk.queue?.items || []).filter((item) => item != null),
      queuePosition: mk.queue?.position ?? 0,
      shuffleMode: mk.shuffleMode === 1 ? 'on' : 'off',
      repeatMode: getRepeatModeFromMK(mk.repeatMode),
    }));

    // Apply autoplay setting from localStorage
    try {
      const savedSettings = localStorage.getItem('app-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.autoplay !== undefined) {
          mk.autoplayEnabled = parsed.autoplay;
        }
      }
    } catch {
      // Ignore parse errors
    }

    // Apply saved playback rate
    const savedRate = playbackRate();
    if (savedRate !== 1) {
      mk.playbackRate = savedRate;
    }

    // Restore the full session (queue + position + offset). Fall back to
    // the single last-played track if no saved session exists. Enable
    // persistence only after restore so we don't overwrite it with empties.
    if (!mk.nowPlayingItem) {
      restoreSession(mk)
        .then((ok) => (ok ? true : restoreLastPlayed(mk).then(() => false)))
        .finally(() => { sessionRestored = true; });
    } else {
      sessionRestored = true;
    }

    onCleanup(() => {
      mk.removeEventListener('playbackStateDidChange', handlePlaybackStateChange);
      mk.removeEventListener('nowPlayingItemDidChange', handleNowPlayingChange);
      mk.removeEventListener('playbackTimeDidChange', handleTimeChange);
      mk.removeEventListener('playbackDurationDidChange', handleDurationChange);
      mk.removeEventListener('queueItemsDidChange', handleQueueChange);
      mk.removeEventListener('queuePositionDidChange', handleQueuePositionChange);
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
    if (isVideoPlaying()) videoStartedAt = Date.now();
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
    if (isVideoPlaying()) videoStartedAt = Date.now();
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

  function setPlaybackRate(rate: number): void {
    const clamped = Math.max(0.5, Math.min(2, rate));
    setPlaybackRateSignal(clamped);
    localStorage.setItem('playback-rate', String(clamped));
    const mk = musicKitStore.instance();
    if (mk) mk.playbackRate = clamped;
  }

  function setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    lastVolumeSetAt = Date.now();
    setState((prev) => ({ ...prev, volume: clamped }));
    try {
      localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {
      // localStorage unavailable — volume just won't persist
    }
    const mk = musicKitStore.instance();
    if (mk) mk.volume = clamped;
  }

  function setShuffleMode(mode: ShuffleMode): void {
    const mk = musicKitStore.instance();
    if (mk) {
      mk.shuffleMode = mode === 'on' ? 1 : 0;
      setState((prev) => ({ ...prev, shuffleMode: mode }));
      persistSession(true);
    }
  }

  function toggleShuffle(): void {
    const newMode = state().shuffleMode === 'off' ? 'on' : 'off';
    setShuffleMode(newMode);
  }

  function setRepeatMode(mode: RepeatMode): void {
    const mk = musicKitStore.instance();
    if (mk) {
      const mkMode = mode === 'one' ? 1 : mode === 'all' ? 2 : 0;
      mk.repeatMode = mkMode;
      setState((prev) => ({ ...prev, repeatMode: mode }));
      persistSession(true);
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

  interface StartOpts {
    /** Stable target id (e.g. "album:123") — same key + rapid repeat = deduped. */
    key?: string;
    /** Show this item immediately while MusicKit resolves the real track. */
    optimistic?: MusicKit.MediaItem | null;
  }

  /**
   * Start playback. Token-based: a new request for a different target
   * supersedes an in-flight one; identical rapid repeats are deduped.
   * Sets isLoading immediately so the UI reacts on click.
   */
  async function startPlayback(
    queueSetter: (mk: MusicKit.MusicKitInstance) => Promise<void>,
    mk: MusicKit.MusicKitInstance,
    opts: StartOpts = {}
  ): Promise<void> {
    const now = Date.now();
    const key = opts.key ?? '';
    // Dedupe: same target clicked again within 600ms while still loading.
    if (key && key === lastPlayKey && now - lastPlayAt < 600 && state().isLoading) {
      return;
    }
    lastPlayKey = key;
    lastPlayAt = now;

    const token = ++playToken; // supersedes any in-flight request
    const isCurrent = () => token === playToken;

    // Immediate UI feedback: loading on, progress cleared, optimistic item.
    setState((prev) => ({
      ...prev,
      isLoading: true,
      ...(opts.optimistic ? { nowPlaying: opts.optimistic } : {}),
    }));
    setCurrentTime(0);
    setDuration(0);

    try {
      await queueSetter(mk);
    } catch (err) {
      if (isCurrent()) setState((prev) => ({ ...prev, isLoading: false }));
      throw err;
    }

    if (!isCurrent()) return; // superseded by a newer request — stand down

    // MusicKit v3 does NOT emit queueItemsDidChange for setQueue — pull the
    // new queue into state so the Queue view populates immediately.
    syncQueue();

    // Safety: clear loading if the playing event never arrives.
    setTimeout(() => {
      if (isCurrent()) setState((prev) => ({ ...prev, isLoading: false }));
    }, 2500);
  }

  async function playStation(stationId: string): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) return;

    await startPlayback(async (m) => {
      await m.setQueue({ station: stationId });
      await m.play();
    }, mk, { key: `station:${stationId}` });
  }

  async function playMedia(type: string, id: string, item?: MusicKit.MediaItem): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) return;

    console.log('[Player] playMedia:', type, id);

    try {
      switch (type) {
        case 'songs':
        case 'library-songs':
          await startPlayback(async (m) => {
            await m.setQueue({ [type.startsWith('library') ? 'songs' : 'song']: id });
            await m.play();
          }, mk, { key: `${type}:${id}`, optimistic: item ?? null });
          break;
        case 'music-videos':
          // Ensure video container is attached
          if (videoContainerEl) {
            mk.videoContainerElement = videoContainerEl;
          }
          videoStartedAt = Date.now();
          setIsVideoPlaying(true);
          await startPlayback(async (m) => {
            await m.setQueue({ musicVideo: id });
            await m.play();
          }, mk, { key: `mv:${id}`, optimistic: item ?? null });
          break;
        case 'albums':
        case 'library-albums':
          await playAlbum(id, 0, item);
          break;
        case 'playlists':
        case 'library-playlists':
          await playPlaylist(id, 0, item);
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
            }, mk, { key: `song:${id}`, optimistic: item ?? null });
          }
          break;
      }
    } catch (err) {
      console.error('[Player] playMedia failed:', err);
      // If video playback failed, close the overlay
      if (type === 'music-videos') {
        videoStartedAt = 0;
        setIsVideoPlaying(false);
      }
    }
  }

  async function playMusicVideos(videoIds: string[], startIndex = 0): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk || videoIds.length === 0) return;

    if (videoContainerEl) {
      mk.videoContainerElement = videoContainerEl;
    }
    videoStartedAt = Date.now();
    setIsVideoPlaying(true);

    try {
      await startPlayback(async (m) => {
        // Queue all music videos
        await m.setQueue({ musicVideos: videoIds });
        // Skip to the desired start index
        if (startIndex > 0) {
          await m.changeToMediaAtIndex(startIndex);
        }
        await m.play();
      }, mk, { key: `mvs:${videoIds[0]}:${startIndex}` });
    } catch (err) {
      console.error('[Player] playMusicVideos failed:', err);
      videoStartedAt = 0;
      setIsVideoPlaying(false);
    }
  }

  async function playSong(songId: string, item?: MusicKit.MediaItem): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) return;

    try {
      await startPlayback(async (m) => {
        await m.setQueue({ song: songId });
        await m.play();
      }, mk, { key: `song:${songId}`, optimistic: item ?? null });
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
    }, mk, { key: `songs:${songIds[0]}:${startIndex}` });
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

  async function playAlbum(albumId: string, startIndex: number = 0, item?: MusicKit.MediaItem): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) return;

    try {
      await startPlayback(async (m) => {
        await m.setQueue({ album: albumId });
        await playAtIndex(m, startIndex);
      }, mk, { key: `album:${albumId}:${startIndex}`, optimistic: item ?? null });
    } catch (err) {
      console.error('[Player] playAlbum failed:', err);
    }
  }

  async function playPlaylist(playlistId: string, startIndex: number = 0, item?: MusicKit.MediaItem): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) return;

    try {
      await startPlayback(async (m) => {
        await m.setQueue({ playlist: playlistId });
        await playAtIndex(m, startIndex);
      }, mk, { key: `playlist:${playlistId}:${startIndex}`, optimistic: item ?? null });
    } catch (err) {
      console.error('[Player] playPlaylist failed:', err);
    }
  }

  // Re-derive queue + position from MusicKit's own queue (the source of
  // truth). queueItemsDidChange normally handles this; syncQueue is the
  // explicit pull used right after a mutation, since MusicKit updates its
  // internal queue asynchronously and may not emit for every operation.
  function syncQueue(): void {
    setTimeout(() => {
      const mk = musicKitStore.instance();
      if (!mk) return;
      const items = Array.from(mk.queue?.items || []).filter((item) => item != null);
      setState((prev) => ({
        ...prev,
        queue: items,
        queuePosition: mk.queue?.position ?? prev.queuePosition,
      }));
      persistSession(true);
    }, 50);
  }

  // ── Session persistence ────────────────────────────────────────────────
  // Save queue + position + playback offset so the session resumes after a
  // restart. Guarded by sessionRestored so we never clobber the saved
  // session with empty state before restore runs.
  let sessionRestored = false;
  let lastPersistAt = 0;

  function persistSession(force = false): void {
    if (!sessionRestored) return;
    const now = Date.now();
    if (!force && now - lastPersistAt < 5000) return;
    lastPersistAt = now;

    const s = state();
    if (s.queue.length === 0) return;
    void storageService.saveQueueState({
      items: s.queue.map((i) => ({ id: i.id, type: i.type })),
      position: s.queuePosition,
      shuffleMode: s.shuffleMode,
      repeatMode: s.repeatMode,
      currentTime: currentTime(),
    });
  }

  async function restoreSession(mk: MusicKit.MusicKitInstance): Promise<boolean> {
    try {
      const saved = await storageService.getQueueState();
      if (!saved || !saved.items?.length) return false;

      await mk.setQueue({
        items: saved.items.map((i) => ({
          id: i.id,
          type: i.type as MusicKit.MediaItemType,
        })),
        startWith: saved.position ?? 0,
      });

      if (saved.currentTime && saved.currentTime > 1) {
        // Best effort — seeking pre-playback is flaky on some MusicKit builds.
        try { await mk.seekToTime(saved.currentTime); } catch { /* ignore */ }
      }
      setShuffleMode(saved.shuffleMode ?? 'off');
      setRepeatMode(saved.repeatMode ?? 'none');
      syncQueue();
      // Restored paused — user presses play to resume from the saved offset.
      console.log('[Player] Session restored:', saved.items.length, 'items @', saved.position);
      return true;
    } catch (err) {
      console.warn('[Player] restoreSession failed:', err);
      return false;
    }
  }

  async function addToQueue(id: string, playNext: boolean = false, type: string = 'song'): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) return;

    let descriptor: MusicKit.SetQueueOptions;
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
      isLoading: false,
    }));
    setCurrentTime(0);
    setDuration(0);
    // Clear the persisted session so a cleared queue stays cleared on restart.
    void storageService.clearQueueState();
  }

  async function removeFromQueue(index: number): Promise<void> {
    const mk = musicKitStore.instance();
    if (!mk) return;

    const currentQueue = state().queue;
    if (index < 0 || index >= currentQueue.length) return;

    // Mutate MusicKit's queue, then mirror its resulting truth. No
    // optimistic local splice — that's what desynced UI from playback.
    if (mk.queue && typeof mk.queue.remove === 'function') {
      try {
        mk.queue.remove(index);
      } catch (err) {
        console.error('[Player] queue.remove failed:', err);
      }
      syncQueue();
      return;
    }

    // Older MusicKit without Queue.remove: rebuild from remaining items,
    // keeping the currently-playing track selected.
    try {
      const remaining = currentQueue.filter((_, i) => i !== index);
      const playingIndex = mk.queue?.position ?? 0;
      const newStart = index < playingIndex ? playingIndex - 1 : playingIndex;
      await mk.setQueue({
        items: remaining.map((it) => ({ id: it.id, type: it.type })),
        startWith: Math.max(0, newStart),
      });
      syncQueue();
    } catch (err) {
      console.error('[Player] removeFromQueue rebuild failed:', err);
    }
  }

  async function reorderQueue(fromIndex: number, toIndex: number): Promise<void> {
    const mk = musicKitStore.instance();
    const currentQueue = state().queue;
    if (!mk || !currentQueue.length || fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= currentQueue.length) return;
    if (toIndex < 0 || toIndex >= currentQueue.length) return;

    // MusicKit JS v3 has no public queue-reorder API. Move the item in
    // MusicKit's internal _queueItems array in place (keeping the same
    // reference), then nudge it to recompute derived state. This avoids
    // restarting the current track. Internals are undocumented — fall
    // back to a full setQueue rebuild if the shape isn't as expected.
    const q = mk.queue as unknown as {
      _queueItems?: unknown[];
      _reindex?: () => void;
      _updateQueueItems?: () => void;
    };
    const internal = q?._queueItems;

    if (Array.isArray(internal) && internal.length === currentQueue.length) {
      const [moved] = internal.splice(fromIndex, 1);
      internal.splice(toIndex, 0, moved);
      try {
        if (typeof q._reindex === 'function') q._reindex();
        else if (typeof q._updateQueueItems === 'function') q._updateQueueItems();
      } catch (err) {
        console.error('[Player] queue reindex hook failed:', err);
      }
      syncQueue();
      return;
    }

    // Fallback: rebuild the queue deterministically (restarts current item).
    const reordered = [...currentQueue];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    try {
      await mk.setQueue({
        items: reordered.map((it) => ({ id: it.id, type: it.type })),
        startWith: mk.queue?.position ?? 0,
      });
      syncQueue();
    } catch (err) {
      console.error('[Player] reorderQueue rebuild failed:', err);
    }
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
    playbackRate,
    isVideoPlaying,
    setPlaybackRate,
    setVideoContainer,
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
    playMusicVideos,
    playSong,
    playSongs,
    playAlbum,
    playPlaylist,
    stopVideo,
    addToQueue,
    clearQueueState,
    syncQueue,
    removeFromQueue,
    reorderQueue,
  };
}

export const playerStore = createRoot(createPlayerStore);
