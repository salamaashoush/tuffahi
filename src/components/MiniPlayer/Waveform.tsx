import { Component, For } from 'solid-js';
import { playerStore } from '../../stores/player';

const BAR_COUNT = 48;

// Pre-generated pseudo-random profile per bar — stable across renders.
const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
  const n1 = Math.sin(i * 1.7 + 0.5) * 0.5 + 0.5;
  const n2 = Math.cos(i * 0.9 + 1.3) * 0.5 + 0.5;
  return {
    delay: (n1 * 0.9).toFixed(2),
    dur: (0.55 + n2 * 0.5).toFixed(2),
    minH: 0.12 + n2 * 0.12, // idle / trough scale
    maxH: 0.45 + n1 * 0.55, // peak scale
  };
});

const Waveform: Component = () => {
  const isPlaying = () => playerStore.state().isPlaying;

  return (
    <>
      <style>{`
        @keyframes wf-bounce {
          0%, 100% { transform: scaleY(var(--wf-min)); }
          50%      { transform: scaleY(var(--wf-max)); }
        }
      `}</style>
      <div class="absolute inset-x-0 bottom-0 h-20 flex items-end justify-center gap-[2px] px-5 pointer-events-none">
        {/* Fade so bars read over artwork */}
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <For each={bars}>
          {(bar) => (
            <div
              class="relative z-10 flex-1 max-w-[6px] rounded-full origin-bottom"
              style={{
                height: '100%',
                background: 'linear-gradient(to top, #2563eb, #38bdf8 60%, #a5f3fc)',
                'box-shadow': isPlaying() ? '0 0 6px rgba(56,189,248,0.55)' : 'none',
                '--wf-min': `${bar.minH}`,
                '--wf-max': `${bar.maxH}`,
                transform: isPlaying() ? undefined : `scaleY(${bar.minH})`,
                animation: isPlaying()
                  ? `wf-bounce ${bar.dur}s ease-in-out ${bar.delay}s infinite`
                  : 'none',
                transition: 'transform 0.45s ease-out, box-shadow 0.3s',
              }}
            />
          )}
        </For>
      </div>
    </>
  );
};

export default Waveform;
