import { Component, Show, createSignal, onMount } from 'solid-js';
import { musicKitStore } from '../../stores/musickit';
import { invoke } from '@tauri-apps/api/core';

interface SettingsState {
  audioQuality: 'high' | 'lossless' | 'dolby';
  crossfade: boolean;
  crossfadeDuration: number;
  showLyrics: boolean;
  notifications: boolean;
  miniPlayerOnClose: boolean;
  startOnLogin: boolean;
}

const Settings: Component = () => {
  const [settings, setSettings] = createSignal<SettingsState>({
    audioQuality: 'high',
    crossfade: false,
    crossfadeDuration: 6,
    showLyrics: true,
    notifications: true,
    miniPlayerOnClose: false,
    startOnLogin: false,
  });

  const [isMusicKitConfigured, setIsMusicKitConfigured] = createSignal(false);

  onMount(async () => {
    // Check if MusicKit is properly configured
    try {
      const configured = await invoke<boolean>('is_musickit_configured');
      setIsMusicKitConfigured(configured);
    } catch {
      setIsMusicKitConfigured(false);
    }

    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('app-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch {
        // Ignore parse errors
      }
    }
  });

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('app-settings', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSignOut = async () => {
    await musicKitStore.unauthorize();
  };

  return (
    <div class="max-w-2xl mx-auto pb-8">
      <h1 class="text-3xl font-bold text-white mb-8">Settings</h1>

      {/* Account Section */}
      <section class="mb-8">
        <h2 class="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Account</h2>
        <div class="bg-surface-secondary rounded-xl overflow-hidden">
          <div class="p-4 flex items-center justify-between">
            <div>
              <p class="text-white font-medium">Apple Music</p>
              <p class="text-sm text-white/60">
                {musicKitStore.isAuthorized()
                  ? 'Signed in with Apple ID'
                  : 'Not signed in'
                }
              </p>
            </div>
            <Show
              when={musicKitStore.isAuthorized()}
              fallback={
                <button
                  onClick={() => musicKitStore.authorize()}
                  class="px-4 py-2 bg-apple-red hover:bg-apple-pink text-white text-sm font-medium rounded-lg transition-smooth"
                >
                  Sign In
                </button>
              }
            >
              <button
                onClick={handleSignOut}
                class="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-smooth"
              >
                Sign Out
              </button>
            </Show>
          </div>

                  </div>
      </section>

      {/* Playback Section */}
      <section class="mb-8">
        <h2 class="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Playback</h2>
        <div class="bg-surface-secondary rounded-xl overflow-hidden divide-y divide-white/10">
          {/* Audio Quality */}
          <div class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-white font-medium">Audio Quality</p>
                <p class="text-sm text-white/60">Choose streaming quality</p>
              </div>
              <select
                value={settings().audioQuality}
                onChange={(e) => updateSetting('audioQuality', e.currentTarget.value as SettingsState['audioQuality'])}
                class="px-3 py-2 bg-surface-tertiary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-apple-red cursor-pointer"
                style={{ "color-scheme": "dark" }}
              >
                <option value="high" class="bg-surface-tertiary text-white">High Quality (256 kbps)</option>
                <option value="lossless" class="bg-surface-tertiary text-white">Lossless (ALAC)</option>
                <option value="dolby" class="bg-surface-tertiary text-white">Dolby Atmos</option>
              </select>
            </div>
          </div>

          {/* Crossfade */}
          <div class="p-4">
            <div class="flex items-center justify-between mb-3">
              <div>
                <p class="text-white font-medium">Crossfade</p>
                <p class="text-sm text-white/60">Blend tracks together</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings().crossfade}
                  onChange={(e) => updateSetting('crossfade', e.currentTarget.checked)}
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-surface-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-apple-red"></div>
              </label>
            </div>
            <Show when={settings().crossfade}>
              <div class="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={settings().crossfadeDuration}
                  onInput={(e) => updateSetting('crossfadeDuration', parseInt(e.currentTarget.value))}
                  class="flex-1 accent-apple-red"
                />
                <span class="text-sm text-white/60 w-16">{settings().crossfadeDuration}s</span>
              </div>
            </Show>
          </div>

          {/* Lyrics */}
          <div class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-white font-medium">Show Lyrics</p>
                <p class="text-sm text-white/60">Display synced lyrics when available</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings().showLyrics}
                  onChange={(e) => updateSetting('showLyrics', e.currentTarget.checked)}
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-surface-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-apple-red"></div>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Notifications Section */}
      <section class="mb-8">
        <h2 class="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Notifications</h2>
        <div class="bg-surface-secondary rounded-xl overflow-hidden divide-y divide-white/10">
          <div class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-white font-medium">Now Playing Notifications</p>
                <p class="text-sm text-white/60">Show notification when track changes</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings().notifications}
                  onChange={(e) => updateSetting('notifications', e.currentTarget.checked)}
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-surface-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-apple-red"></div>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Application Section */}
      <section class="mb-8">
        <h2 class="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Application</h2>
        <div class="bg-surface-secondary rounded-xl overflow-hidden divide-y divide-white/10">
          <div class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-white font-medium">Mini Player on Close</p>
                <p class="text-sm text-white/60">Minimize to mini player when closing window</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings().miniPlayerOnClose}
                  onChange={(e) => updateSetting('miniPlayerOnClose', e.currentTarget.checked)}
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-surface-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-apple-red"></div>
              </label>
            </div>
          </div>

          <div class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-white font-medium">Open on Startup</p>
                <p class="text-sm text-white/60">Launch app when you log in</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings().startOnLogin}
                  onChange={(e) => updateSetting('startOnLogin', e.currentTarget.checked)}
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-surface-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-apple-red"></div>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section class="mb-8">
        <h2 class="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Keyboard Shortcuts</h2>
        <div class="bg-surface-secondary rounded-xl overflow-hidden divide-y divide-white/10">
          <ShortcutRow label="Play / Pause" shortcut="Space" />
          <ShortcutRow label="Next Track" shortcut="Ctrl + →" />
          <ShortcutRow label="Previous Track" shortcut="Ctrl + ←" />
          <ShortcutRow label="Volume Up" shortcut="Ctrl + ↑" />
          <ShortcutRow label="Volume Down" shortcut="Ctrl + ↓" />
          <ShortcutRow label="Mute" shortcut="Ctrl + M" />
        </div>
      </section>

      {/* About */}
      <section>
        <h2 class="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">About</h2>
        <div class="bg-surface-secondary rounded-xl overflow-hidden p-4">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-apple-red to-apple-pink flex items-center justify-center">
              <span class="text-3xl text-white">♫</span>
            </div>
            <div>
              <p class="text-white font-semibold text-lg">Apple Music Client</p>
              <p class="text-sm text-white/60">Version 0.1.0</p>
            </div>
          </div>
          <p class="text-sm text-white/40">
            Unofficial client built with Tauri, SolidJS, and MusicKit JS.
            Not affiliated with Apple Inc.
          </p>
        </div>
      </section>
    </div>
  );
};

const ShortcutRow: Component<{ label: string; shortcut: string }> = (props) => (
  <div class="flex items-center justify-between p-4">
    <span class="text-white">{props.label}</span>
    <kbd class="px-2 py-1 bg-surface-tertiary rounded text-sm text-white/60 font-mono">
      {props.shortcut}
    </kbd>
  </div>
);

export default Settings;
