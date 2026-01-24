/**
 * Theme Customizer Component
 * UI for selecting and customizing themes
 */

import { Component, createSignal, createEffect, For, Show } from 'solid-js';
import { X, Check } from 'lucide-solid';
import { themeService, ThemeService, Theme, ThemeColors } from '../../services/themes';
import { logger } from '../../services/logger';

interface ThemeCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ThemeCustomizer: Component<ThemeCustomizerProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal<'gallery' | 'create'>('gallery');
  const [currentTheme, setCurrentTheme] = createSignal(themeService.getCurrentTheme());
  const [customName, setCustomName] = createSignal('My Theme');
  const [customPrimary, setCustomPrimary] = createSignal('#fa2d48');
  const [isCreating, setIsCreating] = createSignal(false);

  createEffect(() => {
    if (props.isOpen) {
      setCurrentTheme(themeService.getCurrentTheme());
    }
  });

  const handleThemeSelect = async (theme: Theme) => {
    await themeService.applyTheme(theme);
    setCurrentTheme(theme);
  };

  const handleDeleteTheme = async (theme: Theme) => {
    if (theme.isBuiltIn) return;

    const confirmed = confirm(`Delete "${theme.name}"?`);
    if (confirmed) {
      await themeService.deleteCustomTheme(theme.id);
      setCurrentTheme(themeService.getCurrentTheme());
    }
  };

  const handleCreateTheme = async () => {
    if (!customName().trim()) return;

    setIsCreating(true);
    try {
      const baseColors = themeService.getCurrentTheme().colors;
      const generatedColors = ThemeService.generateComplementaryColors(customPrimary());

      const colors: ThemeColors = {
        ...baseColors,
        ...generatedColors,
        textPrimary: '#ffffff',
        textSecondary: 'rgba(255, 255, 255, 0.7)',
        textMuted: 'rgba(255, 255, 255, 0.4)',
        success: '#30d158',
        warning: '#ffd60a',
        error: '#ff453a',
      };

      const theme = await themeService.createCustomTheme(customName().trim(), colors);
      await themeService.applyTheme(theme);
      setCurrentTheme(theme);
      setActiveTab('gallery');

      logger.info('theme-customizer', 'Theme created', { name: customName() });
    } catch (error) {
      logger.error('theme-customizer', 'Failed to create theme', { error });
    } finally {
      setIsCreating(false);
    }
  };

  const ThemeCard: Component<{ theme: Theme }> = (cardProps) => (
    <button
      onClick={() => handleThemeSelect(cardProps.theme)}
      class={`relative p-4 rounded-xl transition-all duration-200 ${
        currentTheme().id === cardProps.theme.id
          ? 'ring-2 ring-apple-red scale-105'
          : 'hover:scale-102'
      }`}
      style={{
        background: cardProps.theme.colors.surface,
      }}
    >
      {/* Color preview */}
      <div class="flex gap-1 mb-3">
        <div
          class="w-8 h-8 rounded-full"
          style={{ background: cardProps.theme.colors.primary }}
        />
        <div
          class="w-8 h-8 rounded-full"
          style={{ background: cardProps.theme.colors.background }}
        />
        <div
          class="w-8 h-8 rounded-full"
          style={{ background: cardProps.theme.colors.surfaceSecondary }}
        />
      </div>

      <div
        class="text-sm font-medium truncate"
        style={{ color: cardProps.theme.colors.textPrimary }}
      >
        {cardProps.theme.name}
      </div>

      {/* Delete button for custom themes */}
      <Show when={!cardProps.theme.isBuiltIn}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteTheme(cardProps.theme);
          }}
          class="absolute top-2 right-2 p-1 rounded-full bg-black/30 hover:bg-black/50 text-white/60 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </Show>

      {/* Active indicator */}
      <Show when={currentTheme().id === cardProps.theme.id}>
        <div class="absolute bottom-2 right-2">
          <Check size={20} class="text-apple-red" />
        </div>
      </Show>
    </button>
  );

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={props.onClose}
      >
        <div
          class="bg-surface rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="p-6 border-b border-white/10">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-semibold text-white">Themes</h2>
              <button
                onClick={props.onClose}
                class="text-white/40 hover:text-white transition-smooth"
              >
                <X size={24} />
              </button>
            </div>

            {/* Tabs */}
            <div class="flex gap-2">
              <button
                onClick={() => setActiveTab('gallery')}
                class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab() === 'gallery'
                    ? 'bg-apple-red text-white'
                    : 'bg-surface-secondary text-white/60 hover:text-white'
                }`}
              >
                Theme Gallery
              </button>
              <button
                onClick={() => setActiveTab('create')}
                class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab() === 'create'
                    ? 'bg-apple-red text-white'
                    : 'bg-surface-secondary text-white/60 hover:text-white'
                }`}
              >
                Create Theme
              </button>
            </div>
          </div>

          {/* Content */}
          <div class="p-6 overflow-y-auto max-h-[60vh]">
            <Show when={activeTab() === 'gallery'}>
              {/* Built-in themes */}
              <div class="mb-6">
                <h3 class="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">
                  Built-in Themes
                </h3>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <For each={themeService.getBuiltInThemes()}>
                    {(theme) => <ThemeCard theme={theme} />}
                  </For>
                </div>
              </div>

              {/* Custom themes */}
              <Show when={themeService.getCustomThemes().length > 0}>
                <div>
                  <h3 class="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">
                    Custom Themes
                  </h3>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <For each={themeService.getCustomThemes()}>
                      {(theme) => <ThemeCard theme={theme} />}
                    </For>
                  </div>
                </div>
              </Show>
            </Show>

            <Show when={activeTab() === 'create'}>
              <div class="max-w-md mx-auto">
                <div class="space-y-6">
                  {/* Theme name */}
                  <div>
                    <label class="block text-sm text-white/60 mb-2">Theme Name</label>
                    <input
                      type="text"
                      value={customName()}
                      onInput={(e) => setCustomName(e.currentTarget.value)}
                      placeholder="My Custom Theme"
                      class="w-full px-3 py-2 bg-surface-tertiary rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-apple-red"
                    />
                  </div>

                  {/* Primary color picker */}
                  <div>
                    <label class="block text-sm text-white/60 mb-2">Primary Color</label>
                    <div class="flex items-center gap-3">
                      <input
                        type="color"
                        value={customPrimary()}
                        onInput={(e) => setCustomPrimary(e.currentTarget.value)}
                        class="w-12 h-12 rounded-lg cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={customPrimary()}
                        onInput={(e) => setCustomPrimary(e.currentTarget.value)}
                        class="flex-1 px-3 py-2 bg-surface-tertiary rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-apple-red"
                      />
                    </div>
                  </div>

                  {/* Color presets */}
                  <div>
                    <label class="block text-sm text-white/60 mb-2">Quick Presets</label>
                    <div class="flex flex-wrap gap-2">
                      {[
                        '#fa2d48',
                        '#0a84ff',
                        '#30d158',
                        '#bf5af2',
                        '#ff9500',
                        '#ff453a',
                        '#64d2ff',
                        '#ffd60a',
                      ].map((color) => (
                        <button
                          onClick={() => setCustomPrimary(color)}
                          class={`w-10 h-10 rounded-lg transition-transform hover:scale-110 ${
                            customPrimary() === color ? 'ring-2 ring-white scale-110' : ''
                          }`}
                          style={{ background: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <label class="block text-sm text-white/60 mb-2">Preview</label>
                    <div
                      class="p-4 rounded-lg"
                      style={{
                        background: `linear-gradient(135deg, ${customPrimary()}20 0%, ${customPrimary()}05 100%)`,
                        border: `1px solid ${customPrimary()}40`,
                      }}
                    >
                      <div class="flex items-center gap-3 mb-3">
                        <div
                          class="w-12 h-12 rounded-lg"
                          style={{ background: customPrimary() }}
                        />
                        <div>
                          <div class="text-white font-medium">Song Title</div>
                          <div class="text-white/60 text-sm">Artist Name</div>
                        </div>
                      </div>
                      <div class="flex gap-2">
                        <button
                          class="px-4 py-2 rounded-lg text-white text-sm font-medium"
                          style={{ background: customPrimary() }}
                        >
                          Play
                        </button>
                        <button class="px-4 py-2 rounded-lg bg-white/10 text-white text-sm">
                          Add to Library
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Create button */}
                  <button
                    onClick={handleCreateTheme}
                    disabled={!customName().trim() || isCreating()}
                    class="w-full py-3 bg-apple-red hover:bg-apple-pink text-white font-medium rounded-lg transition-smooth disabled:opacity-50"
                  >
                    {isCreating() ? 'Creating...' : 'Create Theme'}
                  </button>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default ThemeCustomizer;
