import { Component, Show, createSignal, onMount, onCleanup } from 'solid-js';

interface MiniPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  trackName: string;
  artistName: string;
  artworkUrl: string;
}

const MiniPlayer: Component = () => {
  const [state, setState] = createSignal<MiniPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    trackName: '',
    artistName: '',
    artworkUrl: '',
  });

  onMount(() => {
    const unlisten = window.electron.onPlayerStateUpdate((newState: unknown) => {
      setState(newState as MiniPlayerState);
    });

    onCleanup(unlisten);
  });

  let commandLock = false;
  const sendCommand = async (cmd: string) => {
    if (commandLock) return;
    commandLock = true;
    try {
      await window.electron.miniPlayerCommand(cmd);
    } catch (err) {
      console.error('[MiniPlayer] Command failed:', cmd, err);
    } finally {
      // Prevent rapid-fire commands — wait for MusicKit to settle
      setTimeout(() => { commandLock = false; }, 300);
    }
  };

  const handleClose = async () => {
    try {
      await window.electron.showMainWindow();
    } catch {}
    await window.electron.closeMiniPlayer();
  };

  const handleExpand = async () => {
    try {
      await window.electron.showMainWindow();
      await window.electron.closeMiniPlayer();
    } catch {}
  };

  const progress = () => {
    const s = state();
    if (s.duration <= 0) return 0;
    return (s.currentTime / s.duration) * 100;
  };

  return (
    <div
      class="h-screen w-screen bg-surface/95 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 flex flex-col select-none"
      style={{ "-webkit-app-region": "drag" }}
    >
      {/* Album Art */}
      <div class="relative flex-1 min-h-0">
        <Show
          when={state().artworkUrl}
          fallback={
            <div class="w-full h-full bg-gradient-to-br from-apple-red to-apple-pink flex items-center justify-center">
              <span class="text-6xl text-white/80">&#9835;</span>
            </div>
          }
        >
          <img
            src={state().artworkUrl}
            alt={state().trackName}
            class="w-full h-full object-cover"
          />
        </Show>

        {/* Expand button */}
        <button
          onClick={handleExpand}
          class="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors cursor-pointer"
          style={{ "-webkit-app-region": "no-drag" }}
          title="Expand to full window"
        >
          <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
          </svg>
        </button>

        {/* Close button */}
        <button
          onClick={handleClose}
          class="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors cursor-pointer"
          style={{ "-webkit-app-region": "no-drag" }}
          title="Close mini player"
        >
          <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>

        {/* Gradient overlay for text — pointer-events-none so buttons remain clickable */}
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Track Info & Controls */}
      <div class="p-3 bg-surface" style={{ "-webkit-app-region": "no-drag" }}>
        <Show
          when={state().trackName}
          fallback={
            <p class="text-sm text-white/60 text-center">Not Playing</p>
          }
        >
          <div class="text-center mb-3">
            <p class="text-sm font-medium text-white truncate">
              {state().trackName}
            </p>
            <p class="text-xs text-white/60 truncate">
              {state().artistName}
            </p>
          </div>
        </Show>

        {/* Controls */}
        <div class="flex items-center justify-center gap-4">
          <button
            onClick={() => sendCommand('skipPrevious')}
            class="text-white/60 hover:text-white transition-smooth cursor-pointer"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            onClick={() => sendCommand('togglePlayPause')}
            class="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
          >
            <Show
              when={state().isPlaying}
              fallback={
                <svg class="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              }
            >
              <svg class="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            </Show>
          </button>

          <button
            onClick={() => sendCommand('skipNext')}
            class="text-white/60 hover:text-white transition-smooth cursor-pointer"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div class="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            class="h-full bg-apple-red transition-all"
            style={{ width: `${progress()}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
