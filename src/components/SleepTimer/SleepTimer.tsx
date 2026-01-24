/**
 * Sleep Timer Component
 * Set a timer to stop playback after a duration
 */

import { Component, createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { playerStore } from '../../stores/player';
import { storageService } from '../../services/storage';
import { logger } from '../../services/logger';

interface SleepTimerProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_DURATIONS = [15, 30, 45, 60, 90, 120];

const SleepTimer: Component<SleepTimerProps> = (props) => {
  const [duration, setDuration] = createSignal(30);
  const [endOfTrack, setEndOfTrack] = createSignal(false);
  const [fadeOut, setFadeOut] = createSignal(true);
  const [isActive, setIsActive] = createSignal(false);
  const [remainingTime, setRemainingTime] = createSignal(0);

  let timerInterval: number | undefined;
  let fadeInterval: number | undefined;

  // Load saved settings
  createEffect(async () => {
    const settings = await storageService.getSettings();
    setDuration(settings.sleepTimer.duration);
    setEndOfTrack(settings.sleepTimer.endOfTrack);
    setFadeOut(settings.sleepTimer.fadeOut);
    if (settings.sleepTimer.enabled) {
      // Resume timer if it was active
      // Note: In a real app, you'd need to persist the remaining time
    }
  });

  // Cleanup on unmount
  onCleanup(() => {
    if (timerInterval) clearInterval(timerInterval);
    if (fadeInterval) clearInterval(fadeInterval);
  });

  const startTimer = async () => {
    const durationMs = duration() * 60 * 1000;
    setRemainingTime(durationMs);
    setIsActive(true);

    await storageService.saveSettings({
      sleepTimer: {
        enabled: true,
        duration: duration(),
        endOfTrack: endOfTrack(),
        fadeOut: fadeOut(),
      },
    });

    logger.info('sleep-timer', 'Timer started', { duration: duration() });

    timerInterval = setInterval(() => {
      setRemainingTime((prev) => {
        const newTime = prev - 1000;

        if (newTime <= 0) {
          handleTimerEnd();
          return 0;
        }

        // Start fade out 30 seconds before end
        if (fadeOut() && newTime <= 30000 && newTime > 29000) {
          startFadeOut();
        }

        return newTime;
      });
    }, 1000) as unknown as number;

    props.onClose();
  };

  const startFadeOut = () => {
    const mk = playerStore.state().nowPlaying;
    if (!mk) return;

    const currentVolume = playerStore.state().volume;
    const steps = 30;
    const volumeStep = currentVolume / steps;

    let step = 0;
    fadeInterval = setInterval(() => {
      step++;
      const newVolume = Math.max(0, currentVolume - volumeStep * step);
      playerStore.setVolume(newVolume);

      if (step >= steps) {
        clearInterval(fadeInterval);
      }
    }, 1000) as unknown as number;
  };

  const handleTimerEnd = async () => {
    if (timerInterval) clearInterval(timerInterval);
    if (fadeInterval) clearInterval(fadeInterval);

    setIsActive(false);

    await storageService.saveSettings({
      sleepTimer: {
        enabled: false,
        duration: duration(),
        endOfTrack: endOfTrack(),
        fadeOut: fadeOut(),
      },
    });

    if (endOfTrack()) {
      // Wait for current track to end
      // This would need to be implemented in the player store
      logger.info('sleep-timer', 'Waiting for track to end');
    } else {
      playerStore.pause();
      logger.info('sleep-timer', 'Playback stopped');
    }

    // Reset volume if faded
    if (fadeOut()) {
      playerStore.setVolume(1);
    }
  };

  const cancelTimer = async () => {
    if (timerInterval) clearInterval(timerInterval);
    if (fadeInterval) clearInterval(fadeInterval);

    setIsActive(false);
    setRemainingTime(0);

    await storageService.saveSettings({
      sleepTimer: {
        enabled: false,
        duration: duration(),
        endOfTrack: endOfTrack(),
        fadeOut: fadeOut(),
      },
    });

    // Reset volume if was fading
    if (fadeOut()) {
      playerStore.setVolume(1);
    }

    logger.info('sleep-timer', 'Timer cancelled');
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={props.onClose}>
        <div class="bg-surface rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-white">Sleep Timer</h2>
            <button
              onClick={props.onClose}
              class="text-white/40 hover:text-white transition-smooth"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>

          <Show
            when={!isActive()}
            fallback={
              <div class="text-center">
                <div class="mb-6">
                  <div class="text-5xl font-light text-white mb-2">
                    {formatTime(remainingTime())}
                  </div>
                  <p class="text-white/60">remaining</p>
                </div>

                <div class="flex gap-3 justify-center">
                  <button
                    onClick={() => setRemainingTime((prev) => prev + 5 * 60 * 1000)}
                    class="px-4 py-2 bg-surface-secondary hover:bg-surface-tertiary text-white rounded-lg transition-smooth"
                  >
                    +5 min
                  </button>
                  <button
                    onClick={cancelTimer}
                    class="px-4 py-2 bg-apple-red hover:bg-apple-pink text-white font-medium rounded-lg transition-smooth"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            }
          >
            {/* Duration presets */}
            <div class="mb-6">
              <label class="block text-sm text-white/60 mb-3">Duration</label>
              <div class="grid grid-cols-3 gap-2">
                {PRESET_DURATIONS.map((mins) => (
                  <button
                    onClick={() => setDuration(mins)}
                    class={`px-4 py-3 rounded-lg text-sm font-medium transition-smooth ${
                      duration() === mins
                        ? 'bg-apple-red text-white'
                        : 'bg-surface-secondary hover:bg-surface-tertiary text-white/60 hover:text-white'
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            {/* Custom duration */}
            <div class="mb-6">
              <label class="block text-sm text-white/60 mb-2">Custom (minutes)</label>
              <input
                type="number"
                min="1"
                max="480"
                value={duration()}
                onInput={(e) => setDuration(Math.max(1, parseInt(e.currentTarget.value) || 1))}
                class="w-full px-3 py-2 bg-surface-tertiary rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-apple-red"
              />
            </div>

            {/* Options */}
            <div class="space-y-3 mb-6">
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={endOfTrack()}
                  onChange={(e) => setEndOfTrack(e.currentTarget.checked)}
                  class="sr-only peer"
                />
                <div class="w-9 h-5 bg-surface-tertiary rounded-full peer peer-checked:bg-apple-red transition-colors relative">
                  <div class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${endOfTrack() ? 'translate-x-4' : ''}`} />
                </div>
                <span class="text-sm text-white">Stop at end of track</span>
              </label>

              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fadeOut()}
                  onChange={(e) => setFadeOut(e.currentTarget.checked)}
                  class="sr-only peer"
                />
                <div class="w-9 h-5 bg-surface-tertiary rounded-full peer peer-checked:bg-apple-red transition-colors relative">
                  <div class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${fadeOut() ? 'translate-x-4' : ''}`} />
                </div>
                <span class="text-sm text-white">Fade out audio</span>
              </label>
            </div>

            {/* Start button */}
            <button
              onClick={startTimer}
              class="w-full py-3 bg-apple-red hover:bg-apple-pink text-white font-medium rounded-lg transition-smooth"
            >
              Start Timer
            </button>
          </Show>
        </div>
      </div>
    </Show>
  );
};

// Mini indicator for player bar
export const SleepTimerIndicator: Component<{ remainingTime: number; onClick: () => void }> = (props) => (
  <Show when={props.remainingTime > 0}>
    <button
      onClick={props.onClick}
      class="flex items-center gap-1 px-2 py-1 bg-apple-red/20 rounded text-xs text-apple-red"
      title="Sleep timer active"
    >
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z" />
      </svg>
      <span>{Math.ceil(props.remainingTime / 60000)}m</span>
    </button>
  </Show>
);

export default SleepTimer;
