import { Component, Show } from 'solid-js';
import { playerStore } from '../../stores/player';

const Controls: Component = () => {
  const { state, togglePlayPause, skipNext, skipPrevious, toggleShuffle, toggleRepeat } = playerStore;

  return (
    <div class="flex items-center gap-4">
      {/* Shuffle */}
      <button
        onClick={toggleShuffle}
        class={`transition-smooth relative ${
          state().shuffleMode === 'on'
            ? 'text-apple-red'
            : 'text-white/40 hover:text-white'
        }`}
        title={state().shuffleMode === 'on' ? 'Shuffle: On' : 'Shuffle: Off'}
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
        </svg>
        <Show when={state().shuffleMode === 'on'}>
          <span class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-apple-red rounded-full" />
        </Show>
      </button>

      {/* Previous */}
      <button
        onClick={() => skipPrevious()}
        class="text-white/60 hover:text-white transition-smooth"
        title="Previous"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
        </svg>
      </button>

      {/* Play/Pause */}
      <button
        onClick={() => togglePlayPause()}
        class="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-smooth"
        title={state().isPlaying ? 'Pause' : 'Play'}
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

      {/* Next */}
      <button
        onClick={() => skipNext()}
        class="text-white/60 hover:text-white transition-smooth"
        title="Next"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
        </svg>
      </button>

      {/* Repeat */}
      <button
        onClick={toggleRepeat}
        class={`transition-smooth relative ${
          state().repeatMode !== 'none'
            ? 'text-apple-red'
            : 'text-white/40 hover:text-white'
        }`}
        title={
          state().repeatMode === 'one'
            ? 'Repeat: One'
            : state().repeatMode === 'all'
            ? 'Repeat: All'
            : 'Repeat: Off'
        }
      >
        <Show
          when={state().repeatMode === 'one'}
          fallback={
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
          }
        >
          {/* Repeat One Icon */}
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z" />
          </svg>
        </Show>
        <Show when={state().repeatMode !== 'none'}>
          <span class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-apple-red rounded-full" />
        </Show>
      </button>
    </div>
  );
};

export default Controls;
