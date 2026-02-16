import { Component, Show, createSignal, onMount } from 'solid-js';
import { Palette } from 'lucide-solid';
import { musicKitStore } from '../../stores/musickit';
import { playerStore } from '../../stores/player';
import { themeService } from '../../services/themes';
import ThemeCustomizer from '../ThemeCustomizer/ThemeCustomizer';

interface SettingsState {
  audioQuality: 'standard' | 'high';
  autoplay: boolean;
  notifications: boolean;
  miniPlayerOnClose: boolean;
  startOnLogin: boolean;
}

const Settings: Component = () => {
  const [settings, setSettings] = createSignal<SettingsState>({
    audioQuality: 'high',
    autoplay: true,
    notifications: true,
    miniPlayerOnClose: false,
    startOnLogin: false,
  });

  const [isMusicKitConfigured, setIsMusicKitConfigured] = createSignal(false);
  const [showThemeCustomizer, setShowThemeCustomizer] = createSignal(false);
  const [currentThemeName, setCurrentThemeName] = createSignal(themeService.getCurrentTheme().name);

  onMount(async () => {
    // Check if MusicKit is properly configured
    try {
      const configured = await window.electron.isMusicKitConfigured();
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

    // Sync open-at-login from Electron (source of truth)
    try {
      const openAtLogin = await window.electron.getOpenAtLogin();
      setSettings((prev) => {
        const updated = { ...prev, startOnLogin: openAtLogin };
        localStorage.setItem('app-settings', JSON.stringify(updated));
        return updated;
      });
    } catch {
      // Ignore — may fail in dev
    }

    // Sync close behavior to main process from localStorage
    try {
      await window.electron.setCloseBehavior(settings().miniPlayerOnClose);
    } catch {
      // Ignore
    }

    // Apply audio quality to MusicKit
    try {
      const mk = musicKitStore.instance() as any;
      if (mk) mk.bitrate = settings().audioQuality === 'high' ? 256 : 64;
    } catch {
      // Ignore
    }

    // Listen for theme changes
    themeService.onThemeChange((theme) => {
      setCurrentThemeName(theme.name);
    });
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
        <div class="bg-surface-secondary rounded-xl overflow-hidden divide-y divide-white/10">
          <div class="p-4 flex items-center justify-between">
            <div>
              <p class="text-white font-medium">Apple Music</p>
              <p class="text-sm text-white/60">
                {musicKitStore.isAuthorized() ? 'Signed in' : 'Not signed in'}
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

          <Show when={musicKitStore.isAuthorized() && musicKitStore.storefrontName()}>
            <div class="p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-white font-medium">Region</p>
                  <p class="text-sm text-white/60">Your Apple Music storefront</p>
                </div>
                <div class="text-right">
                  <p class="text-white">{musicKitStore.storefrontName()}</p>
                  <Show when={musicKitStore.storefrontId()}>
                    <p class="text-xs text-white/40 uppercase">{musicKitStore.storefrontId()}</p>
                  </Show>
                </div>
              </div>
            </div>
          </Show>
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
                <p class="text-sm text-white/60">Choose streaming bitrate</p>
              </div>
              <select
                value={settings().audioQuality}
                onChange={(e) => {
                  const value = e.currentTarget.value as SettingsState['audioQuality'];
                  updateSetting('audioQuality', value);
                  const mk = musicKitStore.instance() as any;
                  if (mk) mk.bitrate = value === 'high' ? 256 : 64;
                }}
                class="px-3 py-2 bg-surface-tertiary rounded-lg text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-apple-red cursor-pointer"
                style={{ "color-scheme": "dark" }}
              >
                <option value="high" class="bg-surface-tertiary text-white">High Quality (256 kbps)</option>
                <option value="standard" class="bg-surface-tertiary text-white">Standard (64 kbps)</option>
              </select>
            </div>
          </div>

          {/* Autoplay */}
          <div class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-white font-medium">Autoplay</p>
                <p class="text-sm text-white/60">Continue playing similar music when queue ends</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings().autoplay}
                  onChange={(e) => {
                    updateSetting('autoplay', e.currentTarget.checked);
                    // Apply to MusicKit instance
                    const mk = musicKitStore.instance() as any;
                    if (mk) mk.autoplayEnabled = e.currentTarget.checked;
                  }}
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-surface-tertiary peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-apple-red"></div>
              </label>
            </div>
          </div>

          {/* Playback Speed */}
          <div class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-white font-medium">Playback Speed</p>
                <p class="text-sm text-white/60">Adjust playback rate</p>
              </div>
              <select
                value={playerStore.playbackRate()}
                onChange={(e) => {
                  playerStore.setPlaybackRate(parseFloat(e.currentTarget.value));
                }}
                class="px-3 py-2 bg-surface-tertiary rounded-lg text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-apple-red cursor-pointer"
                style={{ "color-scheme": "dark" }}
              >
                <option value="0.5" class="bg-surface-tertiary text-white">0.5x</option>
                <option value="0.75" class="bg-surface-tertiary text-white">0.75x</option>
                <option value="1" class="bg-surface-tertiary text-white">1.0x (Normal)</option>
                <option value="1.25" class="bg-surface-tertiary text-white">1.25x</option>
                <option value="1.5" class="bg-surface-tertiary text-white">1.5x</option>
                <option value="1.75" class="bg-surface-tertiary text-white">1.75x</option>
                <option value="2" class="bg-surface-tertiary text-white">2.0x</option>
              </select>
            </div>
          </div>

        </div>
      </section>

      {/* Appearance Section */}
      <section class="mb-8">
        <h2 class="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Appearance</h2>
        <div class="bg-surface-secondary rounded-xl overflow-hidden">
          <button
            onClick={() => setShowThemeCustomizer(true)}
            class="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Palette size={20} class="text-white" />
              </div>
              <div class="text-left">
                <p class="text-white font-medium">Theme</p>
                <p class="text-sm text-white/60">{currentThemeName()}</p>
              </div>
            </div>
            <svg class="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
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
                <div class="w-11 h-6 bg-surface-tertiary peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-apple-red"></div>
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
                  onChange={(e) => {
                    const value = e.currentTarget.checked;
                    updateSetting('miniPlayerOnClose', value);
                    window.electron.setCloseBehavior(value);
                  }}
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-surface-tertiary peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-apple-red"></div>
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
                  onChange={(e) => {
                    const value = e.currentTarget.checked;
                    updateSetting('startOnLogin', value);
                    window.electron.setOpenAtLogin(value);
                  }}
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-surface-tertiary peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-apple-red"></div>
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
          <ShortcutRow label="Mini Player" shortcut="Ctrl + Shift + M" />
        </div>
        <p class="text-xs text-white/30 mt-2 px-1">Media keys (play/pause, next, previous) also work globally when the app is in the background.</p>
      </section>

      {/* About */}
      <section>
        <h2 class="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">About</h2>
        <div class="bg-surface-secondary rounded-xl overflow-hidden p-4">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-16 h-16 rounded-xl overflow-hidden">
              <svg viewBox="0 0 512 512" class="w-full h-full"><defs><linearGradient id="ab" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#14B8A6"/><stop offset="50%" stop-color="#0D9488"/><stop offset="100%" stop-color="#115E59"/></linearGradient><linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FCD34D"/><stop offset="100%" stop-color="#F59E0B"/></linearGradient></defs><rect width="512" height="512" rx="108" fill="url(#ab)"/><path d="M256 105C320 115 375 175 375 260C375 340 320 405 256 415C192 405 137 340 137 260C137 175 192 115 256 105Z" fill="#fff" fill-opacity=".93"/><g fill="url(#ab)"><rect x="198" y="240" width="16" height="70" rx="8" opacity=".75"/><rect x="228" y="200" width="16" height="120" rx="8" opacity=".8"/><rect x="258" y="170" width="16" height="160" rx="8" opacity=".85"/><rect x="288" y="210" width="16" height="110" rx="8" opacity=".8"/><rect x="318" y="250" width="16" height="60" rx="8" opacity=".75"/></g><path d="M256 105C254 88 258 70 272 55" fill="none" stroke="url(#gd)" stroke-width="6" stroke-linecap="round"/><path d="M268 62C285 48 310 45 325 52C308 62 285 68 268 62Z" fill="url(#gd)"/></svg>
            </div>
            <div>
              <p class="text-white font-semibold text-lg">Tuffahi <span class="text-white/40 text-sm font-normal">تُفَّاحِي</span></p>
              <p class="text-sm text-white/60">Version 0.1.0</p>
            </div>
          </div>
          <p class="text-sm text-white/40">
            Unofficial client built with Electron, SolidJS, and MusicKit JS.
            Not affiliated with Apple Inc.
          </p>
        </div>
      </section>

      {/* Theme Customizer Modal */}
      <ThemeCustomizer
        isOpen={showThemeCustomizer()}
        onClose={() => setShowThemeCustomizer(false)}
      />
    </div>
  );
};

const ShortcutRow: Component<{ label: string; shortcut: string }> = (props) => (
  <div class="flex items-center justify-between p-4">
    <span class="text-white">{props.label}</span>
    <kbd class="px-2 py-1 bg-surface-tertiary rounded-sm text-sm text-white/60 font-mono">
      {props.shortcut}
    </kbd>
  </div>
);

export default Settings;
