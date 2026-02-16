/**
 * MusicKit JS Type Definitions
 * Comprehensive types for Apple MusicKit JS API
 */

declare global {
  interface Window {
    MusicKit: typeof MusicKit;
  }
}

declare namespace MusicKit {
  // Configuration
  function configure(config: Configuration): Promise<MusicKitInstance>;
  function getInstance(): MusicKitInstance;

  interface Configuration {
    developerToken: string;
    app: AppConfiguration;
    bitrate?: PlaybackBitrate;
    storefrontId?: string;
  }

  interface AppConfiguration {
    name: string;
    build: string;
    icon?: string;
  }

  type PlaybackBitrate = 64 | 256 | 'STANDARD' | 'HIGH' | 'LOSSLESS';

  // Main Instance
  interface MusicKitInstance {
    // Properties
    readonly isAuthorized: boolean;
    readonly musicUserToken: string;
    readonly storefrontId: string;
    readonly storefrontCountryCode: string;
    playbackState: PlaybackStates;
    bitrate: PlaybackBitrate;
    nowPlayingItem: MediaItem | null;
    queue: Queue;
    volume: number;
    playbackTime: number;
    currentPlaybackDuration: number;
    currentPlaybackProgress: number;
    repeatMode: PlayerRepeatMode;
    shuffleMode: PlayerShuffleMode;

    // Authorization
    authorize(): Promise<string>;
    unauthorize(): Promise<void>;

    // Playback Controls
    play(): Promise<void>;
    pause(): Promise<void>;
    stop(): Promise<void>;
    skipToNextItem(): Promise<void>;
    skipToPreviousItem(): Promise<void>;
    seekToTime(time: number): Promise<void>;
    changeToMediaAtIndex(index: number): Promise<void>;
    changeToMediaItem(descriptor: MediaItemDescriptor): Promise<void>;

    // Queue Management
    setQueue(options: SetQueueOptions): Promise<Queue>;
    clearQueue(): Promise<void>;

    // API Access
    api: API;

    // Event Handling
    addEventListener<K extends keyof MusicKitEvents>(
      event: K,
      callback: (event: MusicKitEvents[K]) => void
    ): void;
    removeEventListener<K extends keyof MusicKitEvents>(
      event: K,
      callback: (event: MusicKitEvents[K]) => void
    ): void;
  }

  // Playback States
  enum PlaybackStates {
    none = 0,
    loading = 1,
    playing = 2,
    paused = 3,
    stopped = 4,
    ended = 5,
    seeking = 6,
    waiting = 7,
    stalled = 8,
    completed = 9,
  }

  type PlayerRepeatMode = 0 | 1 | 2; // none, one, all
  type PlayerShuffleMode = 0 | 1; // off, on

  // Events
  interface MusicKitEvents {
    authorizationStatusDidChange: { authorizationStatus: number };
    playbackStateDidChange: { state: PlaybackStates; oldState: PlaybackStates };
    nowPlayingItemDidChange: { item: MediaItem | null };
    playbackTimeDidChange: { currentPlaybackTime: number; currentPlaybackDuration: number };
    playbackDurationDidChange: { duration: number };
    playbackProgressDidChange: { progress: number };
    queueItemsDidChange: { items: MediaItem[] };
    queuePositionDidChange: { position: number; item: MediaItem | null };
    playbackVolumeDidChange: { volume: number };
    shuffleModeDidChange: { shuffleMode: PlayerShuffleMode };
    repeatModeDidChange: { repeatMode: PlayerRepeatMode };
    mediaCanPlay: { item: MediaItem };
    mediaPlaybackError: { error: MusicKitError };
    bufferedProgressDidChange: { progress: number };
  }

  interface MusicKitError {
    name: string;
    message: string;
    description?: string;
  }

  // Media Items
  interface MediaItem {
    id: string;
    type: MediaItemType;
    href?: string;
    attributes: MediaItemAttributes;
    relationships?: MediaItemRelationships;
  }

  type MediaItemType =
    | 'songs'
    | 'albums'
    | 'artists'
    | 'playlists'
    | 'stations'
    | 'music-videos'
    | 'library-songs'
    | 'library-albums'
    | 'library-artists'
    | 'library-playlists';

  interface MediaItemAttributes {
    name: string;
    artistName?: string;
    albumName?: string;
    artwork?: Artwork;
    durationInMillis?: number;
    releaseDate?: string;
    genreNames?: string[];
    trackNumber?: number;
    discNumber?: number;
    isExplicit?: boolean;
    hasLyrics?: boolean;
    playParams?: PlayParameters;
    previews?: Preview[];
    url?: string;
    editorialNotes?: EditorialNotes;
    curatorName?: string;
    lastModifiedDate?: string;
    isPublic?: boolean;
    canEdit?: boolean;
    trackCount?: number;
    contentRating?: string;
    composerName?: string;
    isrc?: string;
  }

  interface Artwork {
    url: string;
    width: number;
    height: number;
    bgColor?: string;
    textColor1?: string;
    textColor2?: string;
    textColor3?: string;
    textColor4?: string;
  }

  interface PlayParameters {
    id: string;
    kind: string;
    catalogId?: string;
    isLibrary?: boolean;
  }

  interface Preview {
    url: string;
    hlsUrl?: string;
    artwork?: Artwork;
  }

  interface EditorialNotes {
    short?: string;
    standard?: string;
    name?: string;
    tagline?: string;
  }

  interface MediaItemRelationships {
    albums?: Relationship<Album>;
    artists?: Relationship<Artist>;
    tracks?: Relationship<Song>;
    playlists?: Relationship<Playlist>;
    curator?: Relationship<Curator>;
    'library-albums'?: Relationship<LibraryAlbum>;
  }

  interface Relationship<T> {
    data: T[];
    href?: string;
    next?: string;
  }

  // Resource Types
  interface Song extends MediaItem {
    type: 'songs' | 'library-songs';
    attributes: SongAttributes;
  }

  interface SongAttributes extends MediaItemAttributes {
    artistName: string;
    albumName: string;
    durationInMillis: number;
  }

  interface Album extends MediaItem {
    type: 'albums' | 'library-albums';
    attributes: AlbumAttributes;
  }

  interface AlbumAttributes extends MediaItemAttributes {
    artistName: string;
    trackCount: number;
    isSingle?: boolean;
    isComplete?: boolean;
    isMasteredForItunes?: boolean;
    recordLabel?: string;
    copyright?: string;
  }

  interface Artist extends MediaItem {
    type: 'artists' | 'library-artists';
    attributes: ArtistAttributes;
  }

  interface ArtistAttributes extends MediaItemAttributes {
    genreNames?: string[];
    url?: string;
  }

  interface Playlist extends MediaItem {
    type: 'playlists' | 'library-playlists';
    attributes: PlaylistAttributes;
  }

  interface PlaylistAttributes extends MediaItemAttributes {
    curatorName?: string;
    description?: EditorialNotes;
    isPublic?: boolean;
    canEdit?: boolean;
    playlistType?: 'user-shared' | 'editorial' | 'external' | 'personal-mix';
  }

  interface Station extends MediaItem {
    type: 'stations';
    attributes: StationAttributes;
  }

  interface StationAttributes extends MediaItemAttributes {
    isLive?: boolean;
    stationProviderName?: string;
  }

  interface Curator {
    id: string;
    type: 'curators' | 'apple-curators';
    attributes: CuratorAttributes;
  }

  interface CuratorAttributes {
    name: string;
    artwork?: Artwork;
    editorialNotes?: EditorialNotes;
    url?: string;
  }

  // Library Types
  interface LibrarySong extends Song {
    type: 'library-songs';
  }

  interface LibraryAlbum extends Album {
    type: 'library-albums';
  }

  interface LibraryPlaylist extends Playlist {
    type: 'library-playlists';
  }

  type LibraryResource = LibrarySong | LibraryAlbum | LibraryPlaylist;

  // Queue
  interface Queue {
    items: MediaItem[];
    position: number;
    length: number;
    isEmpty: boolean;
    nextPlayableItem: MediaItem | null;
    previousPlayableItem: MediaItem | null;
  }

  interface SetQueueOptions {
    song?: string;
    songs?: string[];
    album?: string;
    playlist?: string;
    station?: string;
    url?: string;
    items?: MediaItemDescriptor[];
    startPosition?: number;
    startWith?: number;
    repeatMode?: PlayerRepeatMode;
  }

  interface MediaItemDescriptor {
    id?: string;
    type?: MediaItemType;
    attributes?: Partial<MediaItemAttributes>;
  }

  // API
  interface API {
    music<T = unknown>(
      path: string,
      queryParameters?: QueryParameters,
      options?: RequestOptions
    ): Promise<APIResponse<T>>;
    library: LibraryAPI;
  }

  interface QueryParameters {
    [key: string]: string | number | boolean | string[] | undefined;
    limit?: number;
    offset?: number;
    include?: string | string[];
    extend?: string | string[];
    'filter[featured]'?: string;
    term?: string;
    types?: string;
    l?: string;
  }

  interface RequestOptions {
    fetchOptions?: RequestInit;
  }

  interface APIResponse<T> {
    data: T;
    errors?: APIError[];
    meta?: APIMeta;
    next?: string;
  }

  interface APIError {
    id: string;
    title: string;
    detail: string;
    status: string;
    code: string;
  }

  interface APIMeta {
    total?: number;
    filters?: Record<string, unknown>;
  }

  // Library API
  interface LibraryAPI {
    songs(options?: LibraryQueryOptions): Promise<APIResponse<LibrarySong[]>>;
    albums(options?: LibraryQueryOptions): Promise<APIResponse<LibraryAlbum[]>>;
    artists(options?: LibraryQueryOptions): Promise<APIResponse<Artist[]>>;
    playlists(options?: LibraryQueryOptions): Promise<APIResponse<LibraryPlaylist[]>>;
    recentlyAdded(options?: LibraryQueryOptions): Promise<APIResponse<MediaItem[]>>;
    add(options: LibraryAddOptions): Promise<void>;
    remove(options: LibraryRemoveOptions): Promise<void>;
  }

  interface LibraryQueryOptions {
    limit?: number;
    offset?: number;
    include?: string[];
  }

  interface LibraryAddOptions {
    songs?: string[];
    albums?: string[];
    playlists?: string[];
  }

  interface LibraryRemoveOptions {
    songs?: string[];
    albums?: string[];
    playlists?: string[];
  }

  // Search Results
  interface SearchResults {
    songs?: SearchResultSection<Song>;
    albums?: SearchResultSection<Album>;
    artists?: SearchResultSection<Artist>;
    playlists?: SearchResultSection<Playlist>;
    stations?: SearchResultSection<Station>;
  }

  interface SearchResultSection<T> {
    data: T[];
    href?: string;
    next?: string;
  }

  // Charts
  interface ChartResults {
    songs?: ChartSection<Song>;
    albums?: ChartSection<Album>;
    playlists?: ChartSection<Playlist>;
  }

  interface ChartSection<T> {
    chart: string;
    name: string;
    data: T[];
    href?: string;
    next?: string;
  }

  // Recommendations
  interface Recommendation {
    id: string;
    type: 'personal-recommendation';
    attributes: RecommendationAttributes;
    relationships?: {
      contents?: Relationship<MediaItem>;
    };
  }

  interface RecommendationAttributes {
    isGroupRecommendation: boolean;
    nextUpdateDate?: string;
    reason?: {
      stringForDisplay: string;
    };
    resourceTypes: string[];
    title: {
      stringForDisplay: string;
    };
  }

  // Storefront
  interface Storefront {
    id: string;
    type: 'storefronts';
    attributes: StorefrontAttributes;
  }

  interface StorefrontAttributes {
    defaultLanguageTag: string;
    name: string;
    supportedLanguageTags: string[];
  }

  // Genre
  interface Genre {
    id: string;
    type: 'genres';
    attributes: GenreAttributes;
  }

  interface GenreAttributes {
    name: string;
    parentId?: string;
    parentName?: string;
  }

  // Activity (Mood)
  interface Activity {
    id: string;
    type: 'activities';
    attributes: ActivityAttributes;
    relationships?: {
      playlists?: Relationship<Playlist>;
    };
  }

  interface ActivityAttributes {
    name: string;
    artwork?: Artwork;
    editorialNotes?: EditorialNotes;
    url?: string;
  }
}

