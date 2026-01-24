/**
 * Equalizer Component
 * Audio equalizer with presets and custom bands
 */

import { Component, For, Show, createSignal, createEffect } from 'solid-js';
import { storageService } from '../../services/storage';
import type { EqualizerPreset, EqualizerBands } from '../../types';

// Preset configurations
const EQUALIZER_PRESETS: Record<EqualizerPreset, EqualizerBands> = {
  flat: { hz32: 0, hz64: 0, hz125: 0, hz250: 0, hz500: 0, hz1k: 0, hz2k: 0, hz4k: 0, hz8k: 0, hz16k: 0, preamp: 0 },
  acoustic: { hz32: 5, hz64: 5, hz125: 4, hz250: 1, hz500: 2, hz1k: 2, hz2k: 4, hz4k: 4, hz8k: 4, hz16k: 3, preamp: 0 },
  'bass-boost': { hz32: 6, hz64: 5, hz125: 5, hz250: 3, hz500: 1, hz1k: 0, hz2k: 0, hz4k: 0, hz8k: 0, hz16k: 0, preamp: 0 },
  'bass-reducer': { hz32: -6, hz64: -5, hz125: -4, hz250: -2, hz500: 0, hz1k: 0, hz2k: 0, hz4k: 0, hz8k: 0, hz16k: 0, preamp: 0 },
  classical: { hz32: 5, hz64: 4, hz125: 3, hz250: 3, hz500: -2, hz1k: -2, hz2k: 0, hz4k: 3, hz8k: 4, hz16k: 4, preamp: 0 },
  dance: { hz32: 4, hz64: 7, hz125: 5, hz250: 0, hz500: 2, hz1k: 4, hz2k: 5, hz4k: 4, hz8k: 3, hz16k: 0, preamp: 0 },
  deep: { hz32: 5, hz64: 4, hz125: 2, hz250: 1, hz500: 3, hz1k: -2, hz2k: -3, hz4k: -4, hz8k: -4, hz16k: -5, preamp: 0 },
  electronic: { hz32: 5, hz64: 4, hz125: 1, hz250: 0, hz500: -2, hz1k: 2, hz2k: 1, hz4k: 2, hz8k: 5, hz16k: 5, preamp: 0 },
  'hip-hop': { hz32: 5, hz64: 5, hz125: 2, hz250: 3, hz500: -1, hz1k: -1, hz2k: 2, hz4k: 0, hz8k: 2, hz16k: 3, preamp: 0 },
  jazz: { hz32: 4, hz64: 3, hz125: 1, hz250: 2, hz500: -2, hz1k: -2, hz2k: 0, hz4k: 2, hz8k: 3, hz16k: 4, preamp: 0 },
  latin: { hz32: 4, hz64: 3, hz125: 0, hz250: 0, hz500: -2, hz1k: -2, hz2k: -2, hz4k: 0, hz8k: 4, hz16k: 5, preamp: 0 },
  loudness: { hz32: 6, hz64: 5, hz125: 0, hz250: 0, hz500: -2, hz1k: 0, hz2k: -1, hz4k: -5, hz8k: 6, hz16k: 1, preamp: 0 },
  lounge: { hz32: -3, hz64: -2, hz125: -1, hz250: 2, hz500: 4, hz1k: 3, hz2k: 0, hz4k: -2, hz8k: 2, hz16k: 1, preamp: 0 },
  piano: { hz32: 3, hz64: 2, hz125: 0, hz250: 3, hz500: 3, hz1k: 2, hz2k: 4, hz4k: 3, hz8k: 3, hz16k: 4, preamp: 0 },
  pop: { hz32: -2, hz64: -1, hz125: 0, hz250: 2, hz500: 4, hz1k: 4, hz2k: 2, hz4k: 0, hz8k: -1, hz16k: -2, preamp: 0 },
  'r&b': { hz32: 3, hz64: 7, hz125: 6, hz250: 1, hz500: -3, hz1k: -2, hz2k: 3, hz4k: 3, hz8k: 3, hz16k: 4, preamp: 0 },
  rock: { hz32: 5, hz64: 4, hz125: 3, hz250: 2, hz500: -1, hz1k: -2, hz2k: 1, hz4k: 3, hz8k: 4, hz16k: 5, preamp: 0 },
  'small-speakers': { hz32: 6, hz64: 5, hz125: 4, hz250: 3, hz500: 2, hz1k: 1, hz2k: 0, hz4k: -1, hz8k: -2, hz16k: -3, preamp: 0 },
  'spoken-word': { hz32: -3, hz64: 0, hz125: 0, hz250: 1, hz500: 4, hz1k: 5, hz2k: 5, hz4k: 4, hz8k: 2, hz16k: 0, preamp: 0 },
  'treble-boost': { hz32: 0, hz64: 0, hz125: 0, hz250: 0, hz500: 0, hz1k: 1, hz2k: 2, hz4k: 4, hz8k: 5, hz16k: 6, preamp: 0 },
  'treble-reducer': { hz32: 0, hz64: 0, hz125: 0, hz250: 0, hz500: 0, hz1k: -1, hz2k: -2, hz4k: -4, hz8k: -5, hz16k: -6, preamp: 0 },
  'vocal-boost': { hz32: -2, hz64: -3, hz125: -3, hz250: 2, hz500: 5, hz1k: 5, hz2k: 4, hz4k: 2, hz8k: 0, hz16k: -1, preamp: 0 },
  custom: { hz32: 0, hz64: 0, hz125: 0, hz250: 0, hz500: 0, hz1k: 0, hz2k: 0, hz4k: 0, hz8k: 0, hz16k: 0, preamp: 0 },
};

const BAND_LABELS = ['32', '64', '125', '250', '500', '1K', '2K', '4K', '8K', '16K'];
const BAND_KEYS: (keyof Omit<EqualizerBands, 'preamp'>)[] = ['hz32', 'hz64', 'hz125', 'hz250', 'hz500', 'hz1k', 'hz2k', 'hz4k', 'hz8k', 'hz16k'];

interface EqualizerProps {
  onClose?: () => void;
}

const Equalizer: Component<EqualizerProps> = (props) => {
  const [preset, setPreset] = createSignal<EqualizerPreset>('flat');
  const [bands, setBands] = createSignal<EqualizerBands>(EQUALIZER_PRESETS.flat);
  const [isEnabled, setIsEnabled] = createSignal(true);

  // Load saved settings
  createEffect(async () => {
    const settings = await storageService.getSettings();
    setPreset(settings.equalizerPreset);
    if (settings.equalizerPreset === 'custom') {
      setBands(settings.equalizerCustom);
    } else {
      setBands(EQUALIZER_PRESETS[settings.equalizerPreset]);
    }
  });

  const handlePresetChange = async (newPreset: EqualizerPreset) => {
    setPreset(newPreset);
    if (newPreset !== 'custom') {
      setBands(EQUALIZER_PRESETS[newPreset]);
    }
    await storageService.saveSettings({ equalizerPreset: newPreset });
  };

  const handleBandChange = async (band: keyof EqualizerBands, value: number) => {
    const newBands = { ...bands(), [band]: value };
    setBands(newBands);
    setPreset('custom');
    await storageService.saveSettings({
      equalizerPreset: 'custom',
      equalizerCustom: newBands,
    });
  };

  const handleReset = () => {
    handlePresetChange('flat');
  };

  return (
    <div class="bg-surface rounded-xl p-6 w-full max-w-2xl">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-white">Equalizer</h2>
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled()}
              onChange={(e) => setIsEnabled(e.currentTarget.checked)}
              class="sr-only peer"
            />
            <div class="w-9 h-5 bg-surface-tertiary rounded-full peer peer-checked:bg-apple-red transition-colors relative">
              <div class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isEnabled() ? 'translate-x-4' : ''}`} />
            </div>
            <span class="text-sm text-white/60">Enabled</span>
          </label>
          {props.onClose && (
            <button
              onClick={props.onClose}
              class="text-white/40 hover:text-white transition-smooth"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Preset Selector */}
      <div class="mb-6">
        <label class="block text-sm text-white/60 mb-2">Preset</label>
        <div class="flex items-center gap-3">
          <select
            value={preset()}
            onChange={(e) => handlePresetChange(e.currentTarget.value as EqualizerPreset)}
            class="flex-1 px-3 py-2 bg-surface-tertiary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-apple-red"
            style={{ "color-scheme": "dark" }}
            disabled={!isEnabled()}
          >
            <option value="flat">Flat</option>
            <option value="acoustic">Acoustic</option>
            <option value="bass-boost">Bass Boost</option>
            <option value="bass-reducer">Bass Reducer</option>
            <option value="classical">Classical</option>
            <option value="dance">Dance</option>
            <option value="deep">Deep</option>
            <option value="electronic">Electronic</option>
            <option value="hip-hop">Hip-Hop</option>
            <option value="jazz">Jazz</option>
            <option value="latin">Latin</option>
            <option value="loudness">Loudness</option>
            <option value="lounge">Lounge</option>
            <option value="piano">Piano</option>
            <option value="pop">Pop</option>
            <option value="r&b">R&B</option>
            <option value="rock">Rock</option>
            <option value="small-speakers">Small Speakers</option>
            <option value="spoken-word">Spoken Word</option>
            <option value="treble-boost">Treble Boost</option>
            <option value="treble-reducer">Treble Reducer</option>
            <option value="vocal-boost">Vocal Boost</option>
            <option value="custom">Custom</option>
          </select>
          <button
            onClick={handleReset}
            class="px-3 py-2 bg-surface-tertiary hover:bg-surface-secondary text-white/60 hover:text-white text-sm rounded-lg transition-smooth"
            disabled={!isEnabled()}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Preamp */}
      <div class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-white/60">Preamp</span>
          <span class="text-sm text-white/40">{bands().preamp > 0 ? '+' : ''}{bands().preamp} dB</span>
        </div>
        <input
          type="range"
          min="-12"
          max="12"
          step="1"
          value={bands().preamp}
          onInput={(e) => handleBandChange('preamp', parseInt(e.currentTarget.value))}
          class="w-full accent-apple-red"
          disabled={!isEnabled()}
        />
      </div>

      {/* Frequency Bands */}
      <div class="relative">
        {/* Grid lines */}
        <div class="absolute inset-x-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none">
          <div class="border-t border-white/10" />
          <div class="border-t border-white/10" />
          <div class="border-t border-white/20" />
          <div class="border-t border-white/10" />
          <div class="border-t border-white/10" />
        </div>

        {/* Sliders */}
        <div class="grid grid-cols-10 gap-2 relative">
          <For each={BAND_KEYS}>
            {(band, index) => (
              <div class="flex flex-col items-center">
                <div class="h-32 flex items-center justify-center">
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value={bands()[band]}
                    onInput={(e) => handleBandChange(band, parseInt(e.currentTarget.value))}
                    class="h-24 accent-apple-red"
                    style={{
                      'writing-mode': 'vertical-lr',
                      direction: 'rtl',
                    }}
                    disabled={!isEnabled()}
                  />
                </div>
                <span class="text-xs text-white/40 mt-2">{BAND_LABELS[index()]}</span>
                <span class="text-xs text-white/60">{bands()[band] > 0 ? '+' : ''}{bands()[band]}</span>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* dB scale */}
      <div class="flex justify-between text-xs text-white/30 mt-4 px-4">
        <span>+12 dB</span>
        <span>0 dB</span>
        <span>-12 dB</span>
      </div>
    </div>
  );
};

export default Equalizer;
