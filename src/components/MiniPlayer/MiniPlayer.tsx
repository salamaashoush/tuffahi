import { Component, Show } from 'solid-js';
import { playerStore } from '../../stores/player';
import { formatArtworkUrl, formatTime } from '../../lib/musickit';
import Waveform from './Waveform';
import Volume from '../Player/Volume';

const MiniPlayer: Component = () => {
  const { state, currentTime, duration, togglePlayPause, skipNext, skipPrevious, seekTo, isVideoPlaying } = playerStore;

  const handleClose = async () => {
    await window.electron.closeMiniPlayer();
  };

  const progress = () => {
    const dur = duration();
    if (dur <= 0) return 0;
    return (currentTime() / dur) * 100;
  };

  const nowPlaying = () => state().nowPlaying;

  return (
    <>
      {/* Close/expand button — rendered outside the mini player div to avoid overflow clipping,
          fixed position with z-index above the persistent video container */}
      <button
        onClick={handleClose}
        class="fixed top-2 right-2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors cursor-pointer"
        style={{ "-webkit-app-region": "no-drag", "z-index": "100" }}
        title="Exit mini player"
      >
        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
        </svg>
      </button>

      <div
        class="h-screen w-screen bg-surface/95 backdrop-blur-xl overflow-hidden flex flex-col select-none"
        style={{ "-webkit-app-region": "drag" }}
      >
        {/* Artwork / Video Area */}
        <div class="relative flex-1 min-h-0">
          <Show when={!isVideoPlaying()}>
            <Show
              when={nowPlaying()?.attributes.artwork}
              fallback={
                <div class="w-full h-full bg-gradient-to-br from-teal-600 to-teal-900 flex items-center justify-center">
                  <span class="text-6xl text-white/80">&#9835;</span>
                </div>
              }
            >
              <img
                src={formatArtworkUrl(nowPlaying()!.attributes.artwork, 300)}
                alt={nowPlaying()?.attributes.name}
                class="w-full h-full object-cover"
              />
            </Show>
            {/* Waveform overlay for audio playback */}
            <Waveform />
          </Show>

          {/* Gradient overlay — skip for video mode */}
          <Show when={!isVideoPlaying()}>
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
          </Show>
        </div>

      {/* Track Info & Controls */}
      <div class="p-3 bg-surface" style={{ "-webkit-app-region": "no-drag" }}>
        <Show
          when={nowPlaying()}
          fallback={
            <p class="text-sm text-white/60 text-center">Not Playing</p>
          }
        >
          <div class="text-center mb-3">
            <p class="text-sm font-medium text-white truncate">
              {nowPlaying()!.attributes.name}
            </p>
            <p class="text-xs text-white/60 truncate">
              {nowPlaying()!.attributes.artistName}
            </p>
          </div>
        </Show>

        {/* Progress bar */}
        <div class="mb-3">
          <div
            class="h-1 bg-white/20 rounded-full cursor-pointer group relative"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              seekTo(Math.max(0, percent) * duration());
            }}
          >
            <div
              class="h-full bg-white rounded-full relative"
              style={{ width: `${progress()}%` }}
            >
              <div class="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" />
            </div>
          </div>
          <div class="flex justify-between mt-1 text-[10px] text-white/40">
            <span>{formatTime(currentTime())}</span>
            <span>{formatTime(duration())}</span>
          </div>
        </div>

        {/* Controls */}
        <div class="flex items-center justify-between px-2">
          <Volume iconOnly />

          <div class="flex items-center gap-5">
            <button
              onClick={() => skipPrevious()}
              class="text-white/60 hover:text-white transition-smooth cursor-pointer"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            <button
              onClick={() => togglePlayPause()}
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
              onClick={() => skipNext()}
              class="text-white/60 hover:text-white transition-smooth cursor-pointer"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>

          {/* Spacer to balance volume icon on left */}
          <div class="w-5" />
        </div>
      </div>
    </div>
    </>
  );
};

export default MiniPlayer;
