import { Component, createMemo, createSignal, Show, onMount, onCleanup } from 'solid-js';
import { usePlayer } from '../../hooks/usePlayer';

interface VolumeProps {
  iconOnly?: boolean;
}

const Volume: Component<VolumeProps> = (props) => {
  const { state, setVolume } = usePlayer();
  let containerRef: HTMLDivElement | undefined;

  const [previousVolume, setPreviousVolume] = createSignal(1);

  const vol = createMemo(() => state().volume);
  const isMuted = createMemo(() => vol() === 0);
  const isLow = createMemo(() => !isMuted() && vol() < 0.33);
  const isMedium = createMemo(() => !isMuted() && !isLow() && vol() < 0.67);

  const toggleMute = () => {
    if (vol() > 0) {
      setPreviousVolume(vol());
      setVolume(0);
    } else {
      setVolume(previousVolume() > 0 ? previousVolume() : 1);
    }
  };

  const handleSliderInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setVolume(parseFloat(target.value));
  };

  // Scroll wheel — needs { passive: false } to allow preventDefault
  onMount(() => {
    const el = containerRef;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setVolume(Math.max(0, Math.min(1, vol() + delta)));
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    onCleanup(() => el.removeEventListener('wheel', onWheel));
  });

  const VolumeIcon = () => (
    <>
      <Show when={isMuted()}>
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
        </svg>
      </Show>
      <Show when={isLow()}>
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 9v6h4l5 5V4l-5 5H7z" />
        </svg>
      </Show>
      <Show when={isMedium()}>
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
        </svg>
      </Show>
      <Show when={!isMuted() && !isLow() && !isMedium()}>
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      </Show>
    </>
  );

  if (props.iconOnly) {
    return (
      <div ref={containerRef} class="flex items-center">
        <button
          onClick={toggleMute}
          class="text-white/60 hover:text-white transition-smooth cursor-pointer flex items-center justify-center w-5 h-5"
          title={`Volume: ${Math.round(vol() * 100)}% — Click to ${isMuted() ? 'unmute' : 'mute'}, scroll to adjust`}
        >
          <VolumeIcon />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} class="flex items-center gap-2 group">
      <button
        onClick={toggleMute}
        class="text-white/60 hover:text-white transition-smooth flex-shrink-0"
        title={isMuted() ? 'Unmute' : 'Mute'}
      >
        <VolumeIcon />
      </button>

      <div class="w-24 h-5 relative flex items-center">
        <div class="w-full h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            class="h-full bg-white/60 group-hover:bg-white transition-colors rounded-full"
            style={{ width: `${vol() * 100}%` }}
          />
        </div>

        <div
          class="absolute w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm"
          style={{
            left: `calc(${vol() * 100}% - 6px)`,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={vol()}
          onInput={handleSliderInput}
          class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
};

export default Volume;
