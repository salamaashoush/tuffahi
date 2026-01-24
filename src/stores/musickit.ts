import { createSignal, createRoot } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import { waitForMusicKit } from '../lib/musickit';

export interface MusicKitStore {
  instance: () => MusicKit.MusicKitInstance | null;
  isConfigured: () => boolean;
  isAuthorized: () => boolean;
  error: () => string | null;
  initialize: () => Promise<void>;
  authorize: () => Promise<void>;
  unauthorize: () => Promise<void>;
}

function createMusicKitStore(): MusicKitStore {
  const [instance, setInstance] = createSignal<MusicKit.MusicKitInstance | null>(null);
  const [isConfigured, setIsConfigured] = createSignal(false);
  const [isAuthorized, setIsAuthorized] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function initialize(): Promise<void> {
    try {
      setError(null);

      // Wait for MusicKit JS to load
      const MK = await waitForMusicKit();

      // Get developer token from Rust backend
      const developerToken = await invoke<string>('get_developer_token');

      // Configure MusicKit
      const musicKitInstance = await MK.configure({
        developerToken,
        app: {
          name: 'Apple Music Client',
          build: '1.0.0',
        },
      });

      setInstance(musicKitInstance);
      setIsConfigured(true);
      setIsAuthorized(musicKitInstance.isAuthorized);

      // Listen for authorization changes
      musicKitInstance.addEventListener('authorizationStatusDidChange', () => {
        setIsAuthorized(musicKitInstance.isAuthorized);
      });

      console.log('MusicKit initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize MusicKit';
      setError(errorMessage);
      console.error('MusicKit initialization error:', err);
    }
  }

  async function authorize(): Promise<void> {
    const mk = instance();
    if (!mk) {
      throw new Error('MusicKit not initialized');
    }

    try {
      setError(null);
      await mk.authorize();
      setIsAuthorized(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authorization failed';
      setError(errorMessage);
      throw err;
    }
  }

  async function unauthorize(): Promise<void> {
    const mk = instance();
    if (!mk) return;

    try {
      await mk.unauthorize();
      setIsAuthorized(false);
    } catch (err) {
      console.error('Unauthorize error:', err);
    }
  }

  return {
    instance,
    isConfigured,
    isAuthorized,
    error,
    initialize,
    authorize,
    unauthorize,
  };
}

// Create a singleton store
export const musicKitStore = createRoot(createMusicKitStore);
