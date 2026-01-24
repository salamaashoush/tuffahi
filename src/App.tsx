import { Component, lazy, Suspense, createSignal, onMount } from 'solid-js';
import { Route, Router } from '@solidjs/router';
import { useMusicKit } from './hooks/useMusicKit';
import { useTrayEvents } from './hooks/useTrayEvents';
import { useMediaKeys } from './hooks/useMediaKeys';
import { useBrowserNotifications } from './hooks/useNotifications';
import { themeService } from './services/themes';
import Sidebar from './components/Sidebar/Sidebar';
import Player from './components/Player/Player';
import QueuePanel from './components/Queue/QueuePanel';
import NowPlayingView from './components/NowPlaying/NowPlayingView';
import { ContextMenuProvider } from './components/ContextMenu/ContextMenu';
import { AddToPlaylistModalProvider } from './components/Modal/AddToPlaylistModal';

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
const Lyrics = lazy(() => import('./components/Lyrics/Lyrics'));
const Settings = lazy(() => import('./components/Settings/Settings'));

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

  // Initialize MusicKit on app load
  useMusicKit();

  // Initialize theme service
  onMount(() => {
    themeService.init();
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
            <QueuePanel
              isOpen={isQueueOpen()}
              onClose={() => setIsQueueOpen(false)}
            />
          </div>

          {/* Player Bar */}
          <Player
            onQueueClick={() => setIsQueueOpen(!isQueueOpen())}
            onNowPlayingClick={() => setIsNowPlayingOpen(true)}
          />

          {/* Now Playing Full View */}
          <NowPlayingView
            isOpen={isNowPlayingOpen()}
            onClose={() => setIsNowPlayingOpen(false)}
          />
        </div>
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
      <Route path="/lyrics" component={Lyrics} />
      <Route path="/settings" component={Settings} />
      <Route path="/artist/:id" component={ArtistPage} />
      <Route path="/album/:id" component={AlbumPage} />
      <Route path="/playlist/:id" component={PlaylistPage} />
      <Route path="/library/recently-added" component={RecentlyPlayed} />
      <Route path="/library/artists" component={LibraryArtistsPage} />
      <Route path="/library/albums" component={LibraryAlbumsPage} />
      <Route path="/library/songs" component={LibrarySongsPage} />
      <Route path="/library/playlists" component={Playlists} />
      <Route path="*" component={NotFoundPage} />
    </Router>
  );
};

export default App;
