import { createEffect, onMount } from 'solid-js';
import { musicKitStore } from '../stores/musickit';
import { libraryStore } from '../stores/library';

export function useMusicKit() {
  onMount(async () => {
    await musicKitStore.initialize();
  });

  // Fetch library when authorized
  createEffect(() => {
    if (musicKitStore.isAuthorized()) {
      libraryStore.fetchAll();
    }
  });

  return {
    instance: musicKitStore.instance,
    isConfigured: musicKitStore.isConfigured,
    isAuthorized: musicKitStore.isAuthorized,
    error: musicKitStore.error,
    authorize: musicKitStore.authorize,
    unauthorize: musicKitStore.unauthorize,
  };
}
