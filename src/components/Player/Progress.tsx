import { Component, createMemo } from 'solid-js';
import { usePlayer } from '../../hooks/usePlayer';
import { formatTime } from '../../lib/musickit';

const Progress: Component = () => {
  const { state, seekTo } = usePlayer();

  const progress = createMemo(() => {
    const { currentTime, duration } = state();
    if (duration === 0) return 0;
    return (currentTime / duration) * 100;
  });

  const handleSeek = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const time = (parseFloat(target.value) / 100) * state().duration;
    seekTo(time);
  };

  return (
    <div class="flex items-center gap-2 w-full max-w-md">
      <span class="text-xs text-white/60 w-10 text-right tabular-nums">
        {formatTime(state().currentTime)}
      </span>

      <div class="flex-1 relative group">
        {/* Background track */}
        <div class="h-1 bg-white/20 rounded-full overflow-hidden">
          {/* Progress fill */}
          <div
            class="h-full bg-white/80 group-hover:bg-white transition-smooth"
            style={{ width: `${progress()}%` }}
          />
        </div>

        {/* Invisible range input for interaction */}
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress()}
          onInput={handleSeek}
          class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <span class="text-xs text-white/60 w-10 tabular-nums">
        {formatTime(state().duration)}
      </span>
    </div>
  );
};

export default Progress;
