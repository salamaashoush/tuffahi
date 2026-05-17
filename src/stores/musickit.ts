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

// MusicKit v3 persists the Music User Token under a team-scoped key derived
// from the developer token's `iss` claim. We mirror it there (so MusicKit
// rehydrates on its own) and under a stable app key (so we can restore early).
const APP_TOKEN_KEY = 'tuffahi.media-user-token';

function teamTokenKey(developerToken: string): string | null {
  try {
    const payload = JSON.parse(atob(developerToken.split('.')[1]));
    return payload.iss ? `music.${payload.iss}.media-user-token` : null;
  } catch {
    return null;
  }
}

function createMusicKitStore(): MusicKitStore {
  const [instance, setInstance] = createSignal<MusicKit.MusicKitInstance | null>(null);
  const [isConfigured, setIsConfigured] = createSignal(false);
  const [isAuthorized, setIsAuthorized] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [storefrontName, setStorefrontName] = createSignal('');
  const [storefrontId, setStorefrontId] = createSignal('');

  // One-shot resolver for an in-flight authorize() call. Resolved by the
  // single authorizationStatusDidChange listener — never by a timer race.
  let pendingAuth: { resolve: () => void; reject: (e: Error) => void; timer: number } | null = null;

  function settleAuthorized(): void {
    if (!pendingAuth) return;
    clearTimeout(pendingAuth.timer);
    pendingAuth.resolve();
    pendingAuth = null;
  }

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
      const sfId = (mk as any).storefrontCountryCode || (mk as any).storefrontId || '';
      if (sfId) setStorefrontId(sfId.toLowerCase());
    }
  }

  // The single source of truth for auth state. MusicKit only fires this with
  // isAuthorized === true once it has validated the Music User Token, so any
  // subsequent /v1/me/* request is safe — no 403 race.
  function onAuthStatusChange(mk: MusicKit.MusicKitInstance): void {
    const authed = mk.isAuthorized;
    setIsAuthorized(authed);
    if (authed) {
      settleAuthorized();
      fetchAccountInfo();
    }
  }

  // Bridge the Music User Token captured by the Electron auth window into the
  // one MusicKit instance. Assigning `musicUserToken` makes MusicKit validate
  // it and fire authorizationStatusDidChange — no re-configure, no synthetic
  // events, no setTimeout guesswork.
  window.electron.onAppleMusicToken(async (rawToken: string) => {
    const dotCount = (rawToken?.match(/\./g) || []).length;
    console.log('[Tuffahi] IPC received token', {
      len: rawToken?.length,
      dots: dotCount,
      isJWT: dotCount === 2,
      head: rawToken?.slice(0, 16),
      tail: rawToken?.slice(-8),
    });
    if (!rawToken || rawToken.length < 20) return;

    const mk = instance();
    if (!mk) {
      console.warn('[Tuffahi] Token arrived before MusicKit configured — ignoring');
      return;
    }

    try {
      const devToken = await window.electron.getDeveloperToken();
      const teamKey = teamTokenKey(devToken);
      localStorage.setItem(APP_TOKEN_KEY, rawToken);
      if (teamKey) localStorage.setItem(teamKey, rawToken);

      mk.musicUserToken = rawToken;
      console.log('[Tuffahi] musicUserToken set on instance — awaiting auth event');
    } catch (err) {
      console.error('[Tuffahi] Failed to apply Music User Token:', err);
      if (pendingAuth) {
        clearTimeout(pendingAuth.timer);
        pendingAuth.reject(err instanceof Error ? err : new Error('Failed to apply token'));
        pendingAuth = null;
      }
    }
  });

  // Route MusicKit's auth popup through the Electron auth window. The mock
  // window keeps MusicKit's flow from throwing "popup blocked" before the
  // real token arrives over the IPC bridge above.
  const originalOpen = window.open.bind(window);
  window.open = function (url?: string | URL, target?: string, features?: string): Window | null {
    const urlStr = typeof url === 'string' ? url : url?.toString() ?? '';
    if (urlStr.includes('authorize.music.apple.com') || urlStr.includes('buy.itunes.apple.com')) {
      window.electron.openAuthWindow(urlStr).catch((err: unknown) => {
        console.error('Failed to open auth window:', err);
      });
      const mock = { closed: false, close() { (this as Record<string, unknown>).closed = true; }, focus() {}, postMessage() {} };
      return mock as unknown as Window;
    }
    return originalOpen(urlStr, target, features);
  };

  async function initialize(): Promise<void> {
    try {
      setError(null);

      const MK = await waitForMusicKit();
      const developerToken = await window.electron.getDeveloperToken();

      const mk = await MK.configure({
        developerToken,
        app: { name: 'Tuffahi', build: '1.0.0' },
      });

      setInstance(mk);
      setIsConfigured(true);

      mk.addEventListener('authorizationStatusDidChange', () => onAuthStatusChange(mk));

      // Restore a previously captured token so the user stays signed in.
      if (!mk.isAuthorized) {
        const teamKey = teamTokenKey(developerToken);
        const stored =
          localStorage.getItem(APP_TOKEN_KEY) ||
          (teamKey && localStorage.getItem(teamKey)) ||
          null;
        if (stored && stored.length > 20) {
          console.log('[Tuffahi] Restoring stored Music User Token');
          mk.musicUserToken = stored;
        }
      }

      // Reflect whatever state MusicKit settled into after configure/restore.
      onAuthStatusChange(mk);
      console.log('MusicKit initialized, isAuthorized:', mk.isAuthorized);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize MusicKit';
      setError(errorMessage);
      console.error('MusicKit initialization error:', err);
    }
  }

  function authorize(): Promise<void> {
    const mk = instance();
    if (!mk) return Promise.reject(new Error('MusicKit not initialized'));
    if (mk.isAuthorized) {
      setIsAuthorized(true);
      return Promise.resolve();
    }
    if (pendingAuth) {
      return Promise.reject(new Error('Authorization already in progress'));
    }

    setError(null);
    console.log('Tuffahi: Starting authorize()...');

    const promise = new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        pendingAuth = null;
        const e = new Error('Authorization timed out — no token received from Apple sign-in');
        setError(e.message);
        reject(e);
      }, 90_000);
      pendingAuth = { resolve, reject, timer };
    });

    // Opens the Apple sign-in (via the window.open intercept). MusicKit's
    // own promise rejects because the popup is mocked — the real token
    // arrives over the IPC bridge and resolves `promise` via the auth event.
    mk.authorize().catch((err: unknown) => {
      console.log('Tuffahi: native mk.authorize() rejected (expected):', err);
    });

    return promise;
  }

  async function unauthorize(): Promise<void> {
    const mk = instance();
    if (!mk) return;
    try {
      await mk.unauthorize();
      const devToken = await window.electron.getDeveloperToken();
      const teamKey = teamTokenKey(devToken);
      localStorage.removeItem(APP_TOKEN_KEY);
      if (teamKey) localStorage.removeItem(teamKey);
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
