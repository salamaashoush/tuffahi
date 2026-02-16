import { Component, For, Show } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { musicKitStore } from '../../stores/musickit';
import { libraryStore } from '../../stores/library';
import { formatArtworkUrl } from '../../lib/musickit';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const mainNavItems: NavItem[] = [
  { path: '/', label: 'Listen Now', icon: '▶' },
  { path: '/browse', label: 'Browse', icon: '◉' },
  { path: '/radio', label: 'Radio', icon: '◎' },
  { path: '/search', label: 'Search', icon: '⌕' },
  { path: '/curators', label: 'Curators', icon: '♛' },
];

const libraryNavItems: NavItem[] = [
  { path: '/library/recently-added', label: 'Recently Added', icon: '♦' },
  { path: '/library/recently-played', label: 'Recently Played', icon: '♻' },
  { path: '/library/history', label: 'Play History', icon: '⏱' },
  { path: '/library/artists', label: 'Artists', icon: '♫' },
  { path: '/library/albums', label: 'Albums', icon: '◫' },
  { path: '/library/songs', label: 'Songs', icon: '♪' },
];

const Sidebar: Component = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <aside class="w-56 h-full bg-surface flex flex-col border-r border-white/10">
      {/* Logo / Brand */}
      <div class="p-4 flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg overflow-hidden">
          <svg viewBox="0 0 512 512" class="w-full h-full"><defs><linearGradient id="sb" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#14B8A6"/><stop offset="50%" stop-color="#0D9488"/><stop offset="100%" stop-color="#115E59"/></linearGradient><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FCD34D"/><stop offset="100%" stop-color="#F59E0B"/></linearGradient></defs><rect width="512" height="512" rx="108" fill="url(#sb)"/><path d="M256 105C320 115 375 175 375 260C375 340 320 405 256 415C192 405 137 340 137 260C137 175 192 115 256 105Z" fill="#fff" fill-opacity=".93"/><g fill="url(#sb)"><rect x="198" y="240" width="16" height="70" rx="8" opacity=".75"/><rect x="228" y="200" width="16" height="120" rx="8" opacity=".8"/><rect x="258" y="170" width="16" height="160" rx="8" opacity=".85"/><rect x="288" y="210" width="16" height="110" rx="8" opacity=".8"/><rect x="318" y="250" width="16" height="60" rx="8" opacity=".75"/></g><path d="M256 105C254 88 258 70 272 55" fill="none" stroke="url(#sg)" stroke-width="6" stroke-linecap="round"/><path d="M268 62C285 48 310 45 325 52C308 62 285 68 268 62Z" fill="url(#sg)"/></svg>
        </div>
        <div class="min-w-0">
          <span class="font-semibold text-white">Tuffahi</span>
          <Show when={musicKitStore.isAuthorized() && musicKitStore.storefrontName()}>
            <p class="text-xs text-white/40 truncate">{musicKitStore.storefrontName()}</p>
          </Show>
        </div>
      </div>

      {/* Main Navigation */}
      <nav class="px-2 mb-4">
        <For each={mainNavItems}>
          {(item) => (
            <A
              href={item.path}
              class={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-smooth ${
                isActive(item.path)
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span class="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </A>
          )}
        </For>
      </nav>

      {/* Library Section */}
      <div class="px-4 mb-2">
        <h3 class="text-xs font-semibold text-white/40 uppercase tracking-wider">Library</h3>
      </div>

      <nav class="px-2 mb-4">
        <For each={libraryNavItems}>
          {(item) => (
            <A
              href={item.path}
              class={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-smooth ${
                isActive(item.path)
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span class="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </A>
          )}
        </For>
      </nav>

      {/* Playlists Section */}
      <div class="px-4 mb-2">
        <h3 class="text-xs font-semibold text-white/40 uppercase tracking-wider">Playlists</h3>
      </div>

      <div class="flex-1 overflow-y-auto px-2">
        <Show
          when={musicKitStore.isAuthorized()}
          fallback={
            <div class="px-3 py-2 text-sm text-white/40">Sign in to see your playlists</div>
          }
        >
          <For each={libraryStore.state().playlists}>
            {(playlist) => (
              <A
                href={`/playlist/${playlist.id}`}
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-smooth"
              >
                <Show
                  when={playlist.attributes.artwork}
                  fallback={
                    <div class="w-8 h-8 rounded-sm bg-surface-tertiary flex items-center justify-center text-xs">
                      ♫
                    </div>
                  }
                >
                  <img
                    src={formatArtworkUrl(playlist.attributes.artwork, 64)}
                    alt=""
                    class="w-8 h-8 rounded-sm"
                  />
                </Show>
                <span class="truncate">{playlist.attributes.name}</span>
              </A>
            )}
          </For>
        </Show>
      </div>

      {/* User Section */}
      <div class="p-4 border-t border-white/10 space-y-2">
        {/* Settings Link */}
        <A
          href="/settings"
          class={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-smooth ${
            isActive('/settings')
              ? 'bg-white/10 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </svg>
          <span>Settings</span>
        </A>

        <Show
          when={musicKitStore.isAuthorized()}
          fallback={
            <button
              onClick={() => musicKitStore.authorize()}
              class="w-full px-4 py-2 bg-apple-red hover:bg-apple-pink text-white text-sm font-medium rounded-lg transition-smooth"
            >
              Sign In
            </button>
          }
        >
          <button
            onClick={() => musicKitStore.unauthorize()}
            class="w-full px-4 py-2 bg-surface-secondary hover:bg-surface-tertiary text-white/60 hover:text-white text-sm rounded-lg transition-smooth"
          >
            Sign Out
          </button>
        </Show>
      </div>
    </aside>
  );
};

export default Sidebar;
