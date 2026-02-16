import { Component, Show, onMount, createEffect } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { playerStore } from '../../stores/player';
import { searchAPI } from '../../services/api';
import { formatTime } from '../../lib/musickit';
import Volume from '../Player/Volume';

/**
 * VideoPlayer is now ONLY the overlay UI (header, controls, progress).
 * The actual video container lives in App.tsx as a persistent element
 * that never unmounts, so MusicKit's <video> elements survive mode switches.
 */
const VideoPlayer: Component = () => {
  const navigate = useNavigate();
  let overlayRef: HTMLDivElement | undefined;

  const navigateToArtist = async (artistName: string) => {
    const artistId = await searchAPI.findArtistId(artistName);
    if (artistId) {
      playerStore.stopVideo();
      navigate(`/artist/${artistId}`);
    }
  };

  createEffect(() => {
    if (playerStore.isVideoPlaying() && overlayRef) {
      overlayRef.focus();
    }
  });

  const handleClose = () => {
    playerStore.stopVideo();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!playerStore.isVideoPlaying()) return;
    if (e.key === 'Escape') handleClose();
    if (e.key === ' ') {
      e.preventDefault();
      playerStore.togglePlayPause();
    }
  };

  return (
    <Show when={playerStore.isVideoPlaying()}>
      <div
        ref={overlayRef}
        class="fixed inset-0 z-[61] flex flex-col"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Header */}
        <div class="relative z-[62] flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div class="min-w-0">
            <Show when={playerStore.state().nowPlaying}>
              <p class="text-sm font-medium text-white truncate">
                {playerStore.state().nowPlaying!.attributes.name}
              </p>
              <p
                class="text-xs text-white/60 truncate hover:text-white hover:underline cursor-pointer"
                onClick={() => navigateToArtist(playerStore.state().nowPlaying!.attributes.artistName)}
              >
                {playerStore.state().nowPlaying!.attributes.artistName}
              </p>
            </Show>
          </div>
          <div class="flex items-center gap-2">
            {/* Mini Player */}
            <button
              onClick={() => {
                window.electron.openMiniPlayer().catch((err: unknown) => {
                  console.error('Failed to open mini player:', err);
                });
              }}
              class="p-2 text-white/60 hover:text-white transition-smooth rounded-full hover:bg-white/10"
              title="Mini Player"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z" />
              </svg>
            </button>
            {/* Close */}
            <button
              onClick={handleClose}
              class="p-2 text-white/60 hover:text-white transition-smooth rounded-full hover:bg-white/10"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Spacer to let video show through */}
        <div class="flex-1" />

        {/* Bottom Controls */}
        <div class="relative z-[62] p-6 bg-gradient-to-t from-black/80 to-transparent">
          <div class="max-w-3xl mx-auto">
            {/* Progress */}
            <div class="flex items-center gap-3 mb-4">
              <span class="text-xs text-white/60 w-10 text-right">{formatTime(playerStore.currentTime())}</span>
              <div
                class="flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  playerStore.seekTo(percent * playerStore.duration());
                }}
              >
                <div
                  class="h-full bg-white rounded-full relative"
                  style={{ width: `${playerStore.duration() > 0 ? (playerStore.currentTime() / playerStore.duration()) * 100 : 0}%` }}
                >
                  <div class="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                </div>
              </div>
              <span class="text-xs text-white/60 w-10">{formatTime(playerStore.duration())}</span>
            </div>

            {/* Play Controls + Volume */}
            <div class="flex items-center justify-between">
              <div class="w-32" />
              <div class="flex items-center gap-8">
                <button
                  onClick={() => playerStore.skipPrevious()}
                  class="text-white/80 hover:text-white transition-smooth"
                >
                  <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </button>

                <button
                  onClick={() => playerStore.togglePlayPause()}
                  class="w-14 h-14 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <Show
                    when={playerStore.state().isPlaying}
                    fallback={
                      <svg class="w-7 h-7 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    }
                  >
                    <svg class="w-7 h-7 text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  </Show>
                </button>

                <button
                  onClick={() => playerStore.skipNext()}
                  class="text-white/80 hover:text-white transition-smooth"
                >
                  <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </button>
              </div>
              <div class="w-32 flex justify-end">
                <Volume />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default VideoPlayer;
