/**
 * Custom Themes Service
 * Manage and apply custom color themes
 */

import { storageService } from './storage';
import { logger } from './logger';

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryHover: string;

  // Background colors
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Accent colors
  accent: string;
  accentHover: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  isBuiltIn: boolean;
  createdAt?: number;
}

// Built-in themes
const BUILT_IN_THEMES: Theme[] = [
  {
    id: 'default-dark',
    name: 'Default Dark',
    isBuiltIn: true,
    colors: {
      primary: '#fa2d48',
      primaryHover: '#ff4d6d',
      background: '#000000',
      surface: '#1a1a1a',
      surfaceSecondary: '#2a2a2a',
      surfaceTertiary: '#3a3a3a',
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.6)',
      textMuted: 'rgba(255, 255, 255, 0.4)',
      accent: '#fa2d48',
      accentHover: '#ff4d6d',
      success: '#30d158',
      warning: '#ffd60a',
      error: '#ff453a',
    },
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    isBuiltIn: true,
    colors: {
      primary: '#0a84ff',
      primaryHover: '#409cff',
      background: '#0a0f1a',
      surface: '#121926',
      surfaceSecondary: '#1a2332',
      surfaceTertiary: '#232d3f',
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      textMuted: 'rgba(255, 255, 255, 0.4)',
      accent: '#0a84ff',
      accentHover: '#409cff',
      success: '#30d158',
      warning: '#ffd60a',
      error: '#ff453a',
    },
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    isBuiltIn: true,
    colors: {
      primary: '#30d158',
      primaryHover: '#50e178',
      background: '#0a1a0f',
      surface: '#122619',
      surfaceSecondary: '#1a3222',
      surfaceTertiary: '#233e2b',
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      textMuted: 'rgba(255, 255, 255, 0.4)',
      accent: '#30d158',
      accentHover: '#50e178',
      success: '#30d158',
      warning: '#ffd60a',
      error: '#ff453a',
    },
  },
  {
    id: 'sunset-purple',
    name: 'Sunset Purple',
    isBuiltIn: true,
    colors: {
      primary: '#bf5af2',
      primaryHover: '#d97af5',
      background: '#12061a',
      surface: '#1e0f26',
      surfaceSecondary: '#2a1732',
      surfaceTertiary: '#361f3e',
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      textMuted: 'rgba(255, 255, 255, 0.4)',
      accent: '#bf5af2',
      accentHover: '#d97af5',
      success: '#30d158',
      warning: '#ffd60a',
      error: '#ff453a',
    },
  },
  {
    id: 'warm-orange',
    name: 'Warm Orange',
    isBuiltIn: true,
    colors: {
      primary: '#ff9500',
      primaryHover: '#ffad33',
      background: '#1a0f05',
      surface: '#26190a',
      surfaceSecondary: '#33220f',
      surfaceTertiary: '#402b14',
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      textMuted: 'rgba(255, 255, 255, 0.4)',
      accent: '#ff9500',
      accentHover: '#ffad33',
      success: '#30d158',
      warning: '#ffd60a',
      error: '#ff453a',
    },
  },
  {
    id: 'oled-black',
    name: 'OLED Black',
    isBuiltIn: true,
    colors: {
      primary: '#fa2d48',
      primaryHover: '#ff4d6d',
      background: '#000000',
      surface: '#0d0d0d',
      surfaceSecondary: '#1a1a1a',
      surfaceTertiary: '#262626',
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.6)',
      textMuted: 'rgba(255, 255, 255, 0.35)',
      accent: '#fa2d48',
      accentHover: '#ff4d6d',
      success: '#30d158',
      warning: '#ffd60a',
      error: '#ff453a',
    },
  },
];

class ThemeService {
  private currentTheme: Theme = BUILT_IN_THEMES[0];
  private customThemes: Theme[] = [];
  private listeners: Set<(theme: Theme) => void> = new Set();

  async init(): Promise<void> {
    try {
      // Load custom themes from storage
      this.customThemes = await storageService.getCustomThemes();

      // Load current theme preference
      const settings = await storageService.getSettings();
      const savedThemeId = settings.themeId || 'default-dark';

      const theme = this.getTheme(savedThemeId);
      if (theme) {
        await this.applyTheme(theme);
      }

      logger.info('themes', 'Theme service initialized', { currentTheme: this.currentTheme.id });
    } catch (error) {
      logger.error('themes', 'Failed to initialize theme service', { error });
    }
  }

  getBuiltInThemes(): Theme[] {
    return BUILT_IN_THEMES;
  }

  getCustomThemes(): Theme[] {
    return this.customThemes;
  }

  getAllThemes(): Theme[] {
    return [...BUILT_IN_THEMES, ...this.customThemes];
  }

  getTheme(id: string): Theme | undefined {
    return this.getAllThemes().find((t) => t.id === id);
  }

  getCurrentTheme(): Theme {
    return this.currentTheme;
  }

  async applyTheme(theme: Theme): Promise<void> {
    this.currentTheme = theme;

    // Apply CSS variables
    const root = document.documentElement;
    const colors = theme.colors;

    root.style.setProperty('--theme-primary', colors.primary);
    root.style.setProperty('--theme-primary-hover', colors.primaryHover);
    root.style.setProperty('--theme-background', colors.background);
    root.style.setProperty('--theme-surface', colors.surface);
    root.style.setProperty('--theme-surface-secondary', colors.surfaceSecondary);
    root.style.setProperty('--theme-surface-tertiary', colors.surfaceTertiary);
    root.style.setProperty('--theme-text-primary', colors.textPrimary);
    root.style.setProperty('--theme-text-secondary', colors.textSecondary);
    root.style.setProperty('--theme-text-muted', colors.textMuted);
    root.style.setProperty('--theme-accent', colors.accent);
    root.style.setProperty('--theme-accent-hover', colors.accentHover);
    root.style.setProperty('--theme-success', colors.success);
    root.style.setProperty('--theme-warning', colors.warning);
    root.style.setProperty('--theme-error', colors.error);

    // Save preference
    await storageService.saveSettings({ themeId: theme.id });

    // Notify listeners
    this.listeners.forEach((listener) => listener(theme));

    logger.info('themes', 'Theme applied', { themeId: theme.id });
  }

  async createCustomTheme(name: string, colors: ThemeColors): Promise<Theme> {
    const theme: Theme = {
      id: `custom-${Date.now()}`,
      name,
      colors,
      isBuiltIn: false,
      createdAt: Date.now(),
    };

    this.customThemes.push(theme);
    await storageService.saveCustomTheme(theme);

    logger.info('themes', 'Custom theme created', { themeId: theme.id });

    return theme;
  }

  async updateCustomTheme(id: string, updates: Partial<Theme>): Promise<Theme | null> {
    const index = this.customThemes.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const theme = {
      ...this.customThemes[index],
      ...updates,
      id, // Prevent ID change
      isBuiltIn: false, // Prevent built-in change
    };

    this.customThemes[index] = theme;
    await storageService.saveCustomTheme(theme);

    // Re-apply if current theme was updated
    if (this.currentTheme.id === id) {
      await this.applyTheme(theme);
    }

    logger.info('themes', 'Custom theme updated', { themeId: theme.id });

    return theme;
  }

  async deleteCustomTheme(id: string): Promise<boolean> {
    const index = this.customThemes.findIndex((t) => t.id === id);
    if (index === -1) return false;

    this.customThemes.splice(index, 1);
    await storageService.deleteCustomTheme(id);

    // Switch to default if current theme was deleted
    if (this.currentTheme.id === id) {
      await this.applyTheme(BUILT_IN_THEMES[0]);
    }

    logger.info('themes', 'Custom theme deleted', { themeId: id });

    return true;
  }

  onThemeChange(listener: (theme: Theme) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Helper to generate complementary colors
  static generateComplementaryColors(primary: string): Partial<ThemeColors> {
    // Parse hex color
    const hex = primary.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    // Calculate HSL
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;

    let h = 0;
    let s = 0;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r / 255:
          h = ((g - b) / 255 / d + (g < b ? 6 : 0)) / 6;
          break;
        case g / 255:
          h = ((b - r) / 255 / d + 2) / 6;
          break;
        case b / 255:
          h = ((r - g) / 255 / d + 4) / 6;
          break;
      }
    }

    // Generate hover color (slightly lighter)
    const lighterL = Math.min(1, l + 0.1);
    const hoverColor = this.hslToHex(h, s, lighterL);

    // Generate dark background based on hue
    const darkBg = this.hslToHex(h, s * 0.3, 0.05);
    const surface = this.hslToHex(h, s * 0.2, 0.1);
    const surfaceSecondary = this.hslToHex(h, s * 0.15, 0.15);
    const surfaceTertiary = this.hslToHex(h, s * 0.1, 0.2);

    return {
      primary,
      primaryHover: hoverColor,
      accent: primary,
      accentHover: hoverColor,
      background: darkBg,
      surface,
      surfaceSecondary,
      surfaceTertiary,
    };
  }

  private static hslToHex(h: number, s: number, l: number): string {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (x: number) =>
      Math.round(x * 255)
        .toString(16)
        .padStart(2, '0');

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
}

export const themeService = new ThemeService();
export { ThemeService };
export default themeService;
