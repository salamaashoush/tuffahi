import { Component, For, Show, createSignal } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { musicKitStore } from '../../stores/musickit';
import { libraryStore } from '../../stores/library';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const mainNavItems: NavItem[] = [
  { path: '/search', label: 'Search', icon: '⌕' },
  { path: '/', label: 'Home', icon: '⌂' },
  { path: '/browse', label: 'Browse', icon: '◉' },
  { path: '/radio', label: 'Radio', icon: '◎' },
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
  const [menuOpen, setMenuOpen] = createSignal(false);

  const NavLink = (item: NavItem) => (
    <A
      href={item.path}
      class={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-smooth ${
        isActive(item.path)
          ? 'bg-white/10 text-white'
          : 'text-white/55 hover:text-white hover:bg-white/5'
      }`}
    >
      <span class="w-5 text-center text-base flex-shrink-0">{item.icon}</span>
      <span class="truncate">{item.label}</span>
    </A>
  );

  const SectionLabel = (p: { children: string }) => (
    <h3 class="px-4 pt-4 pb-1 text-[11px] font-semibold text-white/35 uppercase tracking-[0.12em]">
      {p.children}
    </h3>
  );

  return (
    <aside class="w-60 xl:w-64 shrink-0 h-full bg-surface flex flex-col border-r border-white/10">
      {/* Brand + account */}
      <div class="flex-shrink-0 p-4 flex items-center gap-3 relative">
        <div class="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-white/10 shadow-lg shadow-black/30 flex-shrink-0">
          <svg viewBox="0 0 512 512" class="w-full h-full"><defs><linearGradient id="sb" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#14B8A6"/><stop offset="50%" stop-color="#0D9488"/><stop offset="100%" stop-color="#115E59"/></linearGradient><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FCD34D"/><stop offset="100%" stop-color="#F59E0B"/></linearGradient></defs><rect width="512" height="512" rx="108" fill="url(#sb)"/><path d="M256 105C320 115 375 175 375 260C375 340 320 405 256 415C192 405 137 340 137 260C137 175 192 115 256 105Z" fill="#fff" fill-opacity=".93"/><g fill="url(#sb)"><rect x="198" y="240" width="16" height="70" rx="8" opacity=".75"/><rect x="228" y="200" width="16" height="120" rx="8" opacity=".8"/><rect x="258" y="170" width="16" height="160" rx="8" opacity=".85"/><rect x="288" y="210" width="16" height="110" rx="8" opacity=".8"/><rect x="318" y="250" width="16" height="60" rx="8" opacity=".75"/></g><path d="M256 105C254 88 258 70 272 55" fill="none" stroke="url(#sg)" stroke-width="6" stroke-linecap="round"/><path d="M268 62C285 48 310 45 325 52C308 62 285 68 268 62Z" fill="url(#sg)"/></svg>
        </div>
        <div class="min-w-0 flex-1">
          <span class="font-bold text-white tracking-tight">Tuffahi</span>
          <Show when={musicKitStore.isAuthorized() && musicKitStore.storefrontName()}>
            <p class="text-xs text-white/40 truncate">{musicKitStore.storefrontName()}</p>
          </Show>
        </div>

        {/* Account button */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          class="flex-shrink-0 w-9 h-9 rounded-full bg-surface-secondary hover:bg-surface-tertiary text-white/70 hover:text-white flex items-center justify-center transition-smooth"
          title="Account"
          aria-haspopup="true"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </button>

        {/* Account menu */}
        <Show when={menuOpen()}>
          <div class="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div class="absolute right-3 top-16 z-50 w-48 bg-surface-secondary border border-white/10 rounded-xl shadow-2xl shadow-black/50 py-1.5 overflow-hidden">
            <A
              href="/settings"
              onClick={() => setMenuOpen(false)}
              class="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-smooth"
            >
              <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
              Settings
            </A>
            <Show
              when={musicKitStore.isAuthorized()}
              fallback={
                <button
                  onClick={() => { setMenuOpen(false); musicKitStore.authorize(); }}
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-smooth"
                >
                  <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z" />
                  </svg>
                  Sign In
                </button>
              }
            >
              <button
                onClick={() => { setMenuOpen(false); musicKitStore.unauthorize(); }}
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-smooth"
              >
                <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                </svg>
                Sign Out
              </button>
            </Show>
          </div>
        </Show>
      </div>

      {/* Scrollable nav region — keeps Brand + footer pinned, scrolls when
          the window is short (fixes the vertical-overflow clipping). */}
      <div class="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
        <nav class="space-y-0.5">
          <For each={mainNavItems}>{(item) => <NavLink {...item} />}</For>
        </nav>

        <SectionLabel>Library</SectionLabel>
        <nav class="space-y-0.5">
          <For each={libraryNavItems}>{(item) => <NavLink {...item} />}</For>
        </nav>

        <SectionLabel>Playlists</SectionLabel>
        <nav class="space-y-0.5">
          <NavLink path="/library/playlists" label="All Playlists" icon="▦" />
          <Show
            when={musicKitStore.isAuthorized()}
            fallback={
              <div class="px-4 py-2 text-sm text-white/40">Sign in to see your playlists</div>
            }
          >
            <For each={libraryStore.state().playlists}>
              {(playlist) => (
                <A
                  href={`/playlist/${playlist.id}`}
                  class={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-smooth ${
                    isActive(`/playlist/${playlist.id}`)
                      ? 'bg-white/10 text-white'
                      : 'text-white/55 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span class="w-5 text-center text-base flex-shrink-0">♫</span>
                  <span class="truncate">{playlist.attributes.name}</span>
                </A>
              )}
            </For>
          </Show>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
