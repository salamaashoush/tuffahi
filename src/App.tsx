import { Component, lazy, Suspense, createSignal, onMount, Show, onCleanup } from 'solid-js';
import { Route, Router } from '@solidjs/router';
import { useMusicKit } from './hooks/useMusicKit';
import { useTrayEvents } from './hooks/useTrayEvents';
import { useMediaKeys } from './hooks/useMediaKeys';
import { useBrowserNotifications } from './hooks/useNotifications';
import { themeService } from './services/themes';
import { keyboardService, setupDefaultShortcuts } from './services/keyboard';
import { playerStore } from './stores/player';
import Sidebar from './components/Sidebar/Sidebar';
import Player from './components/Player/Player';
import { ContextMenuProvider } from './components/ContextMenu/ContextMenu';
import { AddToPlaylistModalProvider } from './components/Modal/AddToPlaylistModal';
import { ToastContainer } from './components/Toast/Toast';

// Lazy load route components
const ForYou = lazy(() => import('./components/ForYou/ForYou'));
const Browse = lazy(() => import('./components/Browse/Browse'));
const Radio = lazy(() => import('./components/Radio/Radio'));
const Search = lazy(() => import('./components/Browse/Search'));
const ArtistPage = lazy(() => import('./components/Browse/ArtistPage'));
const AlbumPage = lazy(() => import('./components/Album/AlbumPage'));
const PlaylistPage = lazy(() => import('./components/Playlist/PlaylistPage'));
const Library = lazy(() => import('./components/Library/Library'));
const RecentlyPlayed = lazy(() => import('./components/Library/RecentlyPlayed'));
const Playlists = lazy(() => import('./components/Library/Playlists'));
const RecentlyPlayedHistory = lazy(() => import('./components/Library/RecentlyPlayedHistory'));
const PlayHistory = lazy(() => import('./components/Library/PlayHistory'));
const Settings = lazy(() => import('./components/Settings/Settings'));

// Lazy load heavy overlay components
const QueuePanel = lazy(() => import('./components/Queue/QueuePanel'));
const NowPlayingView = lazy(() => import('./components/NowPlaying/NowPlayingView'));
const MiniPlayer = lazy(() => import('./components/MiniPlayer/MiniPlayer'));

const LoadingSpinner: Component = () => (
  <div class="flex items-center justify-center h-full">
    <div class="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
  </div>
);


const NotFoundPage: Component = () => (
  <div class="text-center py-20">
    <h2 class="text-xl font-semibold text-white mb-2">Page Not Found</h2>
    <p class="text-white/60">The page you're looking for doesn't exist.</p>
  </div>
);

const LibrarySongsPage: Component = () => <Library view="songs" />;
const LibraryAlbumsPage: Component = () => <Library view="albums" />;
const LibraryArtistsPage: Component = () => <Library view="artists" />;

// Main layout wrapper component
const AppLayout: Component<{ children?: any }> = (props) => {
  const [isQueueOpen, setIsQueueOpen] = createSignal(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = createSignal(false);
  const [isMiniPlayerMode, setIsMiniPlayerMode] = createSignal(false);

  // Initialize MusicKit on app load
  useMusicKit();

  // Initialize theme service and global keyboard shortcuts
  onMount(() => {
    themeService.init();

    setupDefaultShortcuts({
      playPause: () => playerStore.togglePlayPause(),
      next: () => playerStore.skipNext(),
      previous: () => playerStore.skipPrevious(),
      toggleMiniPlayer: () => window.electron.openMiniPlayer(),
    });
    keyboardService.init();

    // Listen for mini player mode transitions from main process
    const unEnter = window.electron.onEnterMiniPlayer(() => {
      setIsMiniPlayerMode(true);
    });
    const unExit = window.electron.onExitMiniPlayer(() => {
      setIsMiniPlayerMode(false);
    });

    onCleanup(() => {
      unEnter();
      unExit();
    });
  });

  // Set up system tray event handlers
  useTrayEvents();

  // Set up media key handlers
  useMediaKeys();

  // Set up notifications
  useBrowserNotifications();

  return (
    <ContextMenuProvider>
      <AddToPlaylistModalProvider>
        <Show
          when={!isMiniPlayerMode()}
          fallback={
            <Suspense fallback={<LoadingSpinner />}>
              <MiniPlayer />
            </Suspense>
          }
        >
          <div class="h-screen flex flex-col bg-black no-select">
            <div class="flex-1 flex overflow-hidden">
              {/* Sidebar */}
              <Sidebar />

              {/* Main Content */}
              <main class="flex-1 overflow-y-auto p-6">
                <Suspense fallback={<LoadingSpinner />}>
                  {props.children}
                </Suspense>
              </main>

              {/* Queue Panel */}
              <Suspense>
                <QueuePanel
                  isOpen={isQueueOpen()}
                  onClose={() => setIsQueueOpen(false)}
                />
              </Suspense>
            </div>

            {/* Player Bar */}
            <Player
              onQueueClick={() => setIsQueueOpen(!isQueueOpen())}
              onNowPlayingClick={() => setIsNowPlayingOpen(true)}
            />

            {/* Now Playing Full View */}
            <Suspense>
              <NowPlayingView
                isOpen={isNowPlayingOpen()}
                onClose={() => setIsNowPlayingOpen(false)}
              />
            </Suspense>

            {/* Toast Notifications */}
            <ToastContainer />
          </div>
        </Show>
      </AddToPlaylistModalProvider>
    </ContextMenuProvider>
  );
};

const App: Component = () => {
  return (
    <Router root={AppLayout}>
      <Route path="/" component={ForYou} />
      <Route path="/browse" component={Browse} />
      <Route path="/radio" component={Radio} />
      <Route path="/search" component={Search} />
      <Route path="/settings" component={Settings} />
      <Route path="/artist/:id" component={ArtistPage} />
      <Route path="/album/:id" component={AlbumPage} />
      <Route path="/playlist/:id" component={PlaylistPage} />
      <Route path="/library/recently-added" component={RecentlyPlayed} />
      <Route path="/library/artists" component={LibraryArtistsPage} />
      <Route path="/library/albums" component={LibraryAlbumsPage} />
      <Route path="/library/songs" component={LibrarySongsPage} />
      <Route path="/library/playlists" component={Playlists} />
      <Route path="/library/recently-played" component={RecentlyPlayedHistory} />
      <Route path="/library/history" component={PlayHistory} />
      <Route path="*" component={NotFoundPage} />
    </Router>
  );
};

export default App;
