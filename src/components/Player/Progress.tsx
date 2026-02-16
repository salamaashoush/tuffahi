import { Component, createMemo, createEffect } from 'solid-js';
import { usePlayer } from '../../hooks/usePlayer';
import { formatTime } from '../../lib/musickit';

const Progress: Component = () => {
  const { currentTime, duration, seekTo } = usePlayer();
  let rangeRef: HTMLInputElement | undefined;

  const progress = createMemo(() => {
    const ct = currentTime();
    const dur = duration();
    if (dur === 0) return 0;
    return (ct / dur) * 100;
  });

  // Keep the native range input in sync with the reactive progress
  createEffect(() => {
    if (rangeRef) {
      rangeRef.value = String(progress());
    }
  });

  const handleSeek = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const time = (parseFloat(target.value) / 100) * duration();
    seekTo(time);
  };

  return (
    <div class="flex items-center gap-2 w-full max-w-md">
      <span class="text-xs text-white/60 w-10 text-right tabular-nums">
        {formatTime(currentTime())}
      </span>

      <div class="flex-1 h-5 relative group flex items-center">
        {/* Background track */}
        <div class="w-full h-1 bg-white/20 rounded-full overflow-hidden">
          {/* Progress fill */}
          <div
            class="h-full bg-white/80 group-hover:bg-white transition-smooth rounded-full"
            style={{ width: `${progress()}%` }}
          />
        </div>

        {/* Thumb indicator */}
        <div
          class="absolute w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-smooth pointer-events-none shadow-sm"
          style={{
            left: `calc(${progress()}% - 6px)`,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />

        {/* Invisible range input for interaction */}
        <input
          ref={rangeRef}
          type="range"
          min="0"
          max="100"
          step="0.1"
          onInput={handleSeek}
          class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <span class="text-xs text-white/60 w-10 tabular-nums">
        {formatTime(duration())}
      </span>
    </div>
  );
};

export default Progress;
