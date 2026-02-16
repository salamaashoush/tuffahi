import { Component, For } from 'solid-js';
import { playerStore } from '../../stores/player';

const BAR_COUNT = 24;

// Pre-generate random delays and height ranges for each bar
const bars = Array.from({ length: BAR_COUNT }, (_, i) => ({
  delay: (Math.sin(i * 1.3) * 0.5 + 0.5) * 0.8, // 0–0.8s pseudo-random delay
  minHeight: 15 + Math.floor((Math.sin(i * 2.1 + 1) * 0.5 + 0.5) * 10), // 15–25%
  maxHeight: 50 + Math.floor((Math.cos(i * 1.7) * 0.5 + 0.5) * 50), // 50–100%
}));

const Waveform: Component = () => {
  const isPlaying = () => playerStore.state().isPlaying;

  return (
    <>
      <style>{`
        @keyframes waveform-bounce {
          0%, 100% { transform: scaleY(var(--wf-min)); }
          50% { transform: scaleY(var(--wf-max)); }
        }
      `}</style>
      <div class="absolute inset-x-0 bottom-0 h-16 flex items-end justify-center gap-[2px] px-4 pointer-events-none">
        {/* Backdrop gradient so bars are visible over artwork */}
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <For each={bars}>
          {(bar) => (
            <div
              class="relative z-10 w-[6px] rounded-t-sm origin-bottom"
              style={{
                'background': 'linear-gradient(to top, rgba(45, 212, 191, 0.9), rgba(45, 212, 191, 0.4))',
                'height': '100%',
                '--wf-min': `${bar.minHeight / 100}`,
                '--wf-max': `${bar.maxHeight / 100}`,
                'transform': isPlaying() ? undefined : `scaleY(${bar.minHeight / 100 * 0.5})`,
                'animation': isPlaying()
                  ? `waveform-bounce ${0.6 + bar.delay * 0.5}s ease-in-out ${bar.delay}s infinite`
                  : 'none',
                'transition': 'transform 0.4s ease-out',
              }}
            />
          )}
        </For>
      </div>
    </>
  );
};

export default Waveform;
