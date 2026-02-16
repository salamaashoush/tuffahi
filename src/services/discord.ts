/**
 * Discord Rich Presence Service
 * Shows currently playing track in Discord
 */

import { logger } from './logger';
import { storageService } from './storage';
import type { DiscordPresence } from '../types';

class DiscordService {
  private isConnected = false;
  private isEnabled = false;
  private updateInterval: number | undefined;
  private currentPresence: DiscordPresence | null = null;

  async init(): Promise<void> {
    const settings = await storageService.getSettings();
    this.isEnabled = settings.discordRichPresence;

    if (this.isEnabled) {
      await this.connect();
    }
  }

  async connect(): Promise<boolean> {
    if (this.isConnected) return true;

    try {
      await window.electron.discordConnect();
      this.isConnected = true;
      logger.info('discord', 'Connected to Discord');
      return true;
    } catch (error) {
      logger.warn('discord', 'Failed to connect to Discord', { error });
      this.isConnected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await window.electron.discordDisconnect();
      this.isConnected = false;
      logger.info('discord', 'Disconnected from Discord');
    } catch (error) {
      logger.warn('discord', 'Failed to disconnect from Discord', { error });
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.isEnabled = enabled;
    await storageService.saveSettings({ discordRichPresence: enabled });

    if (enabled) {
      await this.connect();
      if (this.currentPresence) {
        await this.updatePresence(this.currentPresence);
      }
    } else {
      await this.clearPresence();
      await this.disconnect();
    }
  }

  async updatePresence(presence: DiscordPresence): Promise<void> {
    this.currentPresence = presence;

    if (!this.isEnabled || !this.isConnected) return;

    try {
      await window.electron.discordSetActivity({
        details: presence.details,
        state: presence.state,
        largeImageKey: presence.largeImageKey,
        largeImageText: presence.largeImageText,
        smallImageKey: presence.smallImageKey,
        smallImageText: presence.smallImageText,
        startTimestamp: presence.startTimestamp,
        endTimestamp: presence.endTimestamp,
      });
      logger.debug('discord', 'Presence updated', presence);
    } catch (error) {
      logger.warn('discord', 'Failed to update presence', { error });
    }
  }

  async clearPresence(): Promise<void> {
    this.currentPresence = null;

    if (!this.isConnected) return;

    try {
      await window.electron.discordClearActivity();
      logger.debug('discord', 'Presence cleared');
    } catch (error) {
      logger.warn('discord', 'Failed to clear presence', { error });
    }
  }

  // Helper to create presence from track info
  createPresence(track: {
    name: string;
    artistName: string;
    albumName?: string;
    artworkUrl?: string;
    durationMs?: number;
    currentTimeMs?: number;
  }): DiscordPresence {
    const presence: DiscordPresence = {
      details: track.name,
      state: `by ${track.artistName}`,
      largeImageKey: track.artworkUrl || 'apple_music_logo',
      largeImageText: track.albumName || track.name,
      smallImageKey: 'playing',
      smallImageText: 'Playing',
    };

    // Add timestamps for progress
    if (track.durationMs && track.currentTimeMs !== undefined) {
      const now = Date.now();
      presence.startTimestamp = now - track.currentTimeMs;
      presence.endTimestamp = now + (track.durationMs - track.currentTimeMs);
    }

    return presence;
  }

  // Helper to create paused presence
  createPausedPresence(track: {
    name: string;
    artistName: string;
    albumName?: string;
    artworkUrl?: string;
  }): DiscordPresence {
    return {
      details: track.name,
      state: `by ${track.artistName}`,
      largeImageKey: track.artworkUrl || 'apple_music_logo',
      largeImageText: track.albumName || track.name,
      smallImageKey: 'paused',
      smallImageText: 'Paused',
    };
  }

  isActive(): boolean {
    return this.isEnabled && this.isConnected;
  }
}

export const discordService = new DiscordService();

// Initialize on module load
discordService.init().catch(console.error);
