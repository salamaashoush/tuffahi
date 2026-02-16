import { Component, Show, createSignal, createEffect, createResource, lazy, Suspense } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { playerStore } from '../../stores/player';
import { catalogAPI, searchAPI } from '../../services/api';
import { formatArtworkUrl, formatTime } from '../../lib/musickit';
import HeartButton from '../Rating/HeartButton';
import DislikeButton from '../Rating/DislikeButton';
import QualityBadge from '../QualityBadge/QualityBadge';
import Waveform from '../MiniPlayer/Waveform';

const LyricsView = lazy(() => import('../Lyrics/LyricsView'));

interface NowPlayingViewProps {
  isOpen: boolean;
  onClose: () => void;
}

const NowPlayingView: Component<NowPlayingViewProps> = (props) => {
  const [dominantColor, setDominantColor] = createSignal('#1c1c1e');
  const [showLyrics, setShowLyrics] = createSignal(false);
  const navigate = useNavigate();

  const { state, currentTime, duration, togglePlayPause, skipNext, skipPrevious, seekTo, setVolume } = playerStore;

  const navigateToArtist = async (artistName: string) => {
    const artistId = await searchAPI.findArtistId(artistName);
    if (artistId) {
      props.onClose();
      navigate(`/artist/${artistId}`);
    }
  };

  // Extract dominant color from artwork
  createEffect(() => {
    const nowPlaying = state().nowPlaying;
    if (nowPlaying?.attributes.artwork) {
      setDominantColor('#2c2c2e');
    }
  });

  const progress = () => {
    const ct = currentTime();
    const dur = duration();
    if (dur === 0) return 0;
    return (ct / dur) * 100;
  };

  const handleSeek = (e: MouseEvent) => {
    const target = e.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * duration();
    seekTo(time);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      props.onClose();
    }
  };

  return (
    <div
      class={`fixed inset-0 z-50 transform transition-transform duration-500 ${
        props.isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Background with gradient */}
      <div
        class="absolute inset-0 transition-colors duration-1000"
        style={{
          background: `linear-gradient(to bottom, ${dominantColor()}, #000000)`
        }}
      />

      {/* Content */}
      <div class="relative h-full flex flex-col">
        {/* Header */}
        <div class="flex items-center justify-between p-4">
          <button
            onClick={props.onClose}
            class="p-2 text-white/60 hover:text-white transition-smooth"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div class="text-center">
            <p class="text-xs text-white/60 uppercase tracking-wider">Now Playing</p>
            <Show when={state().nowPlaying}>
              <p class="text-sm text-white/80">{state().nowPlaying!.attributes.albumName}</p>
            </Show>
          </div>

          {/* Spacer to keep header centered */}
          <div class="w-10" />
        </div>

        {/* Main Content */}
        <div class="flex-1 flex items-center justify-center px-8 pb-32">
          {/* Artwork / Lyrics View */}
          <div class="flex flex-col items-center">
            <Show when={state().nowPlaying}>
              {(nowPlaying) => (
                <>
                  <Show
                    when={!showLyrics()}
                    fallback={
                      <div class="w-80 md:w-96 h-80 md:h-96 mb-8">
                        <Suspense fallback={<div class="flex items-center justify-center h-full"><div class="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>}>
                          <LyricsView songId={nowPlaying().id} />
                        </Suspense>
                      </div>
                    }
                  >
                    {/* Large Artwork */}
                    <div class="w-80 h-80 md:w-96 md:h-96 mb-8 relative">
                      <Show
                        when={nowPlaying().attributes.artwork}
                        fallback={
                          <div class="w-full h-full bg-surface-secondary rounded-2xl flex items-center justify-center">
                            <span class="text-8xl text-white/20">♫</span>
                          </div>
                        }
                      >
                        <img
                          src={formatArtworkUrl(nowPlaying().attributes.artwork, 768)}
                          alt={nowPlaying().attributes.name}
                          class="w-full h-full object-cover rounded-2xl album-shadow-sm"
                        />
                      </Show>
                      {/* Waveform overlay on artwork */}
                      <div class="absolute inset-0 rounded-2xl overflow-hidden">
                        <Waveform />
                      </div>
                    </div>
                  </Show>

                  {/* Track Info */}
                  <div class="text-center max-w-md">
                    <div class="flex items-center justify-center gap-2 mb-1">
                      <h1 class="text-2xl font-bold text-white truncate">
                        {nowPlaying().attributes.name}
                      </h1>
                      <QualityBadge audioTraits={(nowPlaying() as any).attributes.audioTraits} />
                    </div>
                    <p
                      class="text-lg text-white/60 mb-2 hover:text-white hover:underline cursor-pointer transition-smooth"
                      onClick={() => navigateToArtist(nowPlaying().attributes.artistName)}
                    >
                      {nowPlaying().attributes.artistName}
                    </p>
                    <div class="flex items-center justify-center gap-3">
                      <HeartButton type="songs" id={nowPlaying().id} size="lg" />
                      <DislikeButton type="songs" id={nowPlaying().id} size="lg" />
                      <button
                        onClick={() => setShowLyrics(!showLyrics())}
                        class={`transition-smooth ${showLyrics() ? 'text-apple-red' : 'text-white/40 hover:text-white/80'}`}
                        title={showLyrics() ? 'Hide Lyrics' : 'Show Lyrics'}
                      >
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 9H7v-2h6v2zm2-4H7V5h8v2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </Show>
          </div>
        </div>

        {/* Controls */}
        <div class="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
          <div class="max-w-2xl mx-auto">
            {/* Progress Bar */}
            <div class="mb-4">
              <div
                class="h-1.5 bg-white/20 rounded-full cursor-pointer group"
                onClick={handleSeek}
              >
                <div
                  class="h-full bg-white rounded-full relative"
                  style={{ width: `${progress()}%` }}
                >
                  <div class="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                </div>
              </div>
              <div class="flex justify-between mt-1 text-xs text-white/60">
                <span>{formatTime(currentTime())}</span>
                <span>{formatTime(duration())}</span>
              </div>
            </div>

            {/* Main Controls */}
            <div class="flex items-center justify-center gap-8">
              {/* Shuffle */}
              <button
                class="text-white/40 hover:text-white transition-smooth"
                title="Shuffle"
              >
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                </svg>
              </button>

              {/* Previous */}
              <button
                onClick={() => skipPrevious()}
                class="text-white/80 hover:text-white transition-smooth"
              >
                <svg class="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              {/* Play/Pause */}
              <button
                onClick={() => togglePlayPause()}
                class="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
              >
                <Show
                  when={state().isPlaying}
                  fallback={
                    <svg class="w-8 h-8 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  }
                >
                  <svg class="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                </Show>
              </button>

              {/* Next */}
              <button
                onClick={() => skipNext()}
                class="text-white/80 hover:text-white transition-smooth"
              >
                <svg class="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>

              {/* Repeat */}
              <button
                class="text-white/40 hover:text-white transition-smooth"
                title="Repeat"
              >
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                </svg>
              </button>
            </div>

            {/* Volume */}
            <div class="flex items-center justify-center gap-4 mt-4">
              <svg class="w-4 h-4 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 9v6h4l5 5V4l-5 5H7z" />
              </svg>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={state().volume}
                onInput={(e) => setVolume(parseFloat(e.currentTarget.value))}
                class="w-32 accent-white"
              />
              <svg class="w-4 h-4 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NowPlayingView;
