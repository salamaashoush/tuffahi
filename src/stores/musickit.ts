import { createSignal, createRoot } from 'solid-js';
import { waitForMusicKit } from '../lib/musickit';

export interface MusicKitStore {
  instance: () => MusicKit.MusicKitInstance | null;
  isConfigured: () => boolean;
  isAuthorized: () => boolean;
  error: () => string | null;
  storefrontName: () => string;
  storefrontId: () => string;
  initialize: () => Promise<void>;
  authorize: () => Promise<void>;
  unauthorize: () => Promise<void>;
}

function createMusicKitStore(): MusicKitStore {
  const [instance, setInstance] = createSignal<MusicKit.MusicKitInstance | null>(null);
  const [isConfigured, setIsConfigured] = createSignal(false);
  const [isAuthorized, setIsAuthorized] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [storefrontName, setStorefrontName] = createSignal('');
  const [storefrontId, setStorefrontId] = createSignal('');

  async function fetchAccountInfo(): Promise<void> {
    const mk = instance();
    if (!mk || !mk.isAuthorized) return;

    try {
      const response = await mk.api.music('/v1/me/storefront');
      const data = response.data as { data: MusicKit.Storefront[] };
      if (data.data?.[0]) {
        setStorefrontName(data.data[0].attributes.name);
        setStorefrontId(data.data[0].id);
      }
    } catch (err) {
      console.warn('[Tuffahi] Failed to fetch storefront info:', err);
      // Fallback to instance property
      const sfId = (mk as any).storefrontCountryCode || (mk as any).storefrontId || '';
      if (sfId) setStorefrontId(sfId.toLowerCase());
    }
  }

  // Bridge auth tokens from the Electron auth window back to MusicKit JS.
  // The main process sends the raw token string AND also evals JS directly.
  // This listener is a backup — the eval handles localStorage + MessageEvent.
  const unlisten = window.electron.onAppleMusicToken(async (rawToken: string) => {
    try {
      console.log('[Tuffahi] IPC received token, payload length:', rawToken?.length);
      if (!rawToken || rawToken.length < 20) return;

      // Store under all possible localStorage key patterns
      localStorage.setItem('music.ampwebplay.media-user-token', rawToken);
      localStorage.setItem('music.Tuffahi.media-user-token', rawToken);
      localStorage.setItem('music.tuffahi.media-user-token', rawToken);

      // Also store under the correct MusicKit team-based key
      try {
        const devToken = await window.electron.getDeveloperToken();
        const jwtParts = devToken.split('.');
        if (jwtParts.length === 3) {
          const payload = JSON.parse(atob(jwtParts[1]));
          if (payload.iss) {
            localStorage.setItem(`music.${payload.iss}.media-user-token`, rawToken);
          }
        }
      } catch {}
      console.log('[Tuffahi] Token stored in localStorage via IPC');

      const mk = instance();
      if (mk) {
        // Set token directly on MusicKit instance
        (mk as unknown as Record<string, unknown>).musicUserToken = rawToken;

        // Close mock popup so MusicKit's authorize() promise resolves
        if (authMockWindow) authMockWindow.closed = true;

        // Dispatch MessageEvent as MusicKit's auth flow expects
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { thirdPartyInfo: { 'music-user-token': rawToken } },
            origin: 'https://authorize.music.apple.com',
          }),
        );

        // Give MusicKit time to process, then check
        await new Promise((r) => setTimeout(r, 1500));
        console.log('[Tuffahi] Post-auth check, isAuthorized:', mk.isAuthorized);

        if (mk.isAuthorized) {
          setIsAuthorized(true);
          fetchAccountInfo();
        } else {
          // Re-configure MusicKit so it picks up the token from localStorage
          console.log('[Tuffahi] Re-configuring MusicKit to pick up token...');
          const MK = await waitForMusicKit();
          const devToken = await window.electron.getDeveloperToken();
          const freshInstance = await MK.configure({
            developerToken: devToken,
            app: { name: 'Tuffahi', build: '1.0.0' },
          });
          setInstance(freshInstance);
          freshInstance.addEventListener('authorizationStatusDidChange', () => {
            setIsAuthorized(freshInstance.isAuthorized);
            if (freshInstance.isAuthorized) fetchAccountInfo();
          });
          if (freshInstance.isAuthorized) {
            setIsAuthorized(true);
            fetchAccountInfo();
          }
        }
      }
    } catch (err) {
      console.error('[Tuffahi] IPC token error:', err);
    }
  });

  // Store mock window ref so MusicKit thinks the popup is open
  let authMockWindow: Record<string, unknown> | null = null;

  // Intercept window.open() globally so MusicKit's auth popup
  // goes through our Electron command instead of being blocked.
  const originalOpen = window.open.bind(window);
  window.open = function (url?: string | URL, target?: string, features?: string): Window | null {
    const urlStr = typeof url === 'string' ? url : url?.toString() ?? '';
    if (urlStr.includes('authorize.music.apple.com') || urlStr.includes('buy.itunes.apple.com')) {
      window.electron.openAuthWindow(urlStr).catch((err: unknown) => {
        console.error('Failed to open auth window:', err);
      });
      // Return a mock so MusicKit doesn't throw
      const mock = { closed: false, close() { (this as Record<string, unknown>).closed = true; }, focus() {}, postMessage() {} };
      authMockWindow = mock as Record<string, unknown>;
      return mock as unknown as Window;
    }
    return originalOpen(urlStr, target, features);
  };

  async function initialize(): Promise<void> {
    try {
      setError(null);

      const MK = await waitForMusicKit();
      const developerToken = await window.electron.getDeveloperToken();

      const musicKitInstance = await MK.configure({
        developerToken,
        app: {
          name: 'Tuffahi',
          build: '1.0.0',
        },
      });

      setInstance(musicKitInstance);
      setIsConfigured(true);

      // If we have a stored token from a previous auth, inject it
      if (!musicKitInstance.isAuthorized) {
        const storedToken = localStorage.getItem('music.ampwebplay.media-user-token')
          || localStorage.getItem('music.Tuffahi.media-user-token')
          || localStorage.getItem('music.tuffahi.media-user-token');
        if (storedToken && storedToken.length > 20) {
          console.log('[Tuffahi] Found stored token, injecting into MusicKit');

          // Store under the correct MusicKit team-based key
          try {
            const jwtParts = developerToken.split('.');
            if (jwtParts.length === 3) {
              const payload = JSON.parse(atob(jwtParts[1]));
              if (payload.iss) {
                const teamKey = `music.${payload.iss}.media-user-token`;
                console.log('[Tuffahi] Storing token under MusicKit key:', teamKey);
                localStorage.setItem(teamKey, storedToken);
              }
            }
          } catch (e) {
            console.warn('[Tuffahi] Could not decode developer token JWT:', e);
          }

          // Set directly on the instance
          (musicKitInstance as unknown as Record<string, unknown>).musicUserToken = storedToken;

          await new Promise((r) => setTimeout(r, 500));
          console.log('[Tuffahi] After injection, isAuthorized:', musicKitInstance.isAuthorized);

          // If still not authorized, re-configure MusicKit to pick up token from localStorage
          if (!musicKitInstance.isAuthorized) {
            console.log('[Tuffahi] Re-configuring MusicKit...');
            const freshInstance = await MK.configure({
              developerToken,
              app: { name: 'Tuffahi', build: '1.0.0' },
            });
            setInstance(freshInstance);
            freshInstance.addEventListener('authorizationStatusDidChange', () => {
              setIsAuthorized(freshInstance.isAuthorized);
              if (freshInstance.isAuthorized) fetchAccountInfo();
            });
            if (freshInstance.isAuthorized) {
              setIsAuthorized(true);
              fetchAccountInfo();
              return;
            }
          }
        }
      }

      setIsAuthorized(musicKitInstance.isAuthorized);
      if (musicKitInstance.isAuthorized) {
        fetchAccountInfo();
      }

      musicKitInstance.addEventListener('authorizationStatusDidChange', () => {
        setIsAuthorized(musicKitInstance.isAuthorized);
        if (musicKitInstance.isAuthorized) {
          fetchAccountInfo();
        }
      });

      console.log('MusicKit initialized, isAuthorized:', musicKitInstance.isAuthorized);
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
      console.log('Tuffahi: Starting MusicKit authorize()...');
      await mk.authorize();
      console.log('Tuffahi: mk.authorize() resolved, isAuthorized:', mk.isAuthorized);
      setIsAuthorized(true);
      fetchAccountInfo();
    } catch (err) {
      console.warn('Tuffahi: mk.authorize() threw:', err);
      // MusicKit may throw because it thinks the popup was blocked,
      // but the token may arrive via our bridge.
      // Give it several seconds — the token relay involves multiple hops.
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        if (mk.isAuthorized) {
          console.log('Tuffahi: MusicKit became authorized after', (i + 1), 'seconds');
          setIsAuthorized(true);
          fetchAccountInfo();
          return;
        }
      }
      if (mk.isAuthorized) {
        setIsAuthorized(true);
        return;
      }
      console.error('Tuffahi: Authorization failed after waiting 15s');
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
      setStorefrontName('');
      setStorefrontId('');
    } catch (err) {
      console.error('Unauthorize error:', err);
    }
  }

  return {
    instance,
    isConfigured,
    isAuthorized,
    error,
    storefrontName,
    storefrontId,
    initialize,
    authorize,
    unauthorize,
  };
}

export const musicKitStore = createRoot(createMusicKitStore);
