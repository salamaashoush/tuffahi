import { Component, createSignal, onMount, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { musicKitStore } from '../../stores/musickit';
import { playerStore } from '../../stores/player';
import { libraryStore } from '../../stores/library';
import { formatArtworkUrl } from '../../lib/musickit';

interface Recommendation {
  id: string;
  type: string;
  attributes: {
    title?: { stringForDisplay: string };
    nextUpdateDate?: string;
  };
  relationships?: {
    contents?: {
      data: Array<{
        id: string;
        type: string;
        attributes: {
          name: string;
          artistName?: string;
          curatorName?: string;
          artwork?: { url: string; width: number; height: number };
        };
      }>;
    };
  };
}

interface HeavyRotation {
  id: string;
  type: string;
  attributes: {
    name: string;
    artistName?: string;
    artwork?: { url: string; width: number; height: number };
  };
}

const ForYou: Component = () => {
  const [recommendations, setRecommendations] = createSignal<Recommendation[]>([]);
  const [heavyRotation, setHeavyRotation] = createSignal<HeavyRotation[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = createSignal<HeavyRotation[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    if (!musicKitStore.isAuthorized()) {
      setIsLoading(false);
      return;
    }

    const mk = musicKitStore.instance();
    if (!mk) return;

    setIsLoading(true);

    try {
      // Fetch recommendations
      const [recsResponse, heavyResponse, recentResponse] = await Promise.all([
        mk.api.music('/v1/me/recommendations', { limit: 10 }).catch(() => null),
        mk.api.music('/v1/me/history/heavy-rotation', { limit: 10 }).catch(() => null),
        mk.api.music('/v1/me/recent/played', { limit: 10 }).catch(() => null),
      ]);

      if (recsResponse) {
        const data = recsResponse.data as { data: Recommendation[] };
        setRecommendations(data.data || []);
      }

      if (heavyResponse) {
        const data = heavyResponse.data as { data: HeavyRotation[] };
        setHeavyRotation(data.data || []);
      }

      if (recentResponse) {
        const data = recentResponse.data as { data: HeavyRotation[] };
        setRecentlyPlayed(data.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setIsLoading(false);
    }
  });

  const handlePlay = (type: string, id: string) => {
    playerStore.playMedia(type, id);
  };

  const getItemLink = (item: { id: string; type: string }) => {
    switch (item.type) {
      case 'albums':
      case 'library-albums':
        return `/album/${item.id}`;
      case 'playlists':
      case 'library-playlists':
        return `/playlist/${item.id}`;
      case 'stations':
        return `/station/${item.id}`;
      default:
        return '#';
    }
  };

  return (
    <div class="space-y-10 pb-8">
      <h1 class="text-3xl font-bold text-white">Listen Now</h1>

      <Show
        when={musicKitStore.isAuthorized()}
        fallback={
          <div class="flex flex-col items-center justify-center py-20">
            <div class="w-24 h-24 rounded-full bg-gradient-to-br from-apple-red to-apple-pink flex items-center justify-center mb-6">
              <span class="text-5xl text-white">♫</span>
            </div>
            <h2 class="text-2xl font-bold text-white mb-2">Welcome</h2>
            <p class="text-white/60 text-center mb-6 max-w-md">
              Sign in with your Apple ID to get personalized recommendations, access your library, and discover new music.
            </p>
            <button
              onClick={() => musicKitStore.authorize()}
              class="px-8 py-3 bg-apple-red hover:bg-apple-pink text-white font-medium rounded-full transition-smooth"
            >
              Sign In with Apple
            </button>
          </div>
        }
      >
        <Show when={error()}>
          <div class="bg-red-500/20 border border-red-500/40 rounded-lg p-4">
            <p class="text-red-400">{error()}</p>
          </div>
        </Show>

        <Show
          when={!isLoading()}
          fallback={
            <div class="space-y-10">
              <For each={Array(3).fill(0)}>
                {() => (
                  <div>
                    <div class="h-6 bg-surface-secondary rounded w-48 mb-4" />
                    <div class="flex gap-4 overflow-hidden">
                      <For each={Array(6).fill(0)}>
                        {() => (
                          <div class="w-44 flex-shrink-0 animate-pulse">
                            <div class="aspect-square bg-surface-secondary rounded-lg mb-2" />
                            <div class="h-4 bg-surface-secondary rounded w-3/4 mb-1" />
                            <div class="h-3 bg-surface-secondary rounded w-1/2" />
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                )}
              </For>
            </div>
          }
        >
          {/* Recently Added from Library */}
          <Show when={libraryStore.state().recentlyAdded.length > 0}>
            <section>
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold text-white">Recently Added</h2>
                <A href="/library/recently-added" class="text-sm text-apple-red hover:underline">
                  See All
                </A>
              </div>
              <div class="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                <For each={libraryStore.state().recentlyAdded.slice(0, 10)}>
                  {(item) => (
                    <MediaCard
                      id={item.id}
                      type={item.type}
                      name={item.attributes.name}
                      subtitle={item.attributes.artistName}
                      artwork={item.attributes.artwork}
                      onPlay={() => handlePlay(item.type, item.id)}
                    />
                  )}
                </For>
              </div>
            </section>
          </Show>

          {/* Heavy Rotation */}
          <Show when={heavyRotation().length > 0}>
            <section>
              <h2 class="text-xl font-semibold text-white mb-4">Heavy Rotation</h2>
              <div class="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                <For each={heavyRotation()}>
                  {(item) => (
                    <MediaCard
                      id={item.id}
                      type={item.type}
                      name={item.attributes.name}
                      subtitle={item.attributes.artistName || ''}
                      artwork={item.attributes.artwork}
                      onPlay={() => handlePlay(item.type, item.id)}
                    />
                  )}
                </For>
              </div>
            </section>
          </Show>

          {/* Recently Played */}
          <Show when={recentlyPlayed().length > 0}>
            <section>
              <h2 class="text-xl font-semibold text-white mb-4">Recently Played</h2>
              <div class="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                <For each={recentlyPlayed()}>
                  {(item) => (
                    <MediaCard
                      id={item.id}
                      type={item.type}
                      name={item.attributes.name}
                      subtitle={item.attributes.artistName || ''}
                      artwork={item.attributes.artwork}
                      onPlay={() => handlePlay(item.type, item.id)}
                    />
                  )}
                </For>
              </div>
            </section>
          </Show>

          {/* Personalized Recommendations */}
          <For each={recommendations()}>
            {(rec) => (
              <Show when={rec.relationships?.contents?.data && rec.relationships.contents.data.length > 0}>
                <section>
                  <h2 class="text-xl font-semibold text-white mb-4">
                    {rec.attributes.title?.stringForDisplay || 'For You'}
                  </h2>
                  <div class="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    <For each={rec.relationships!.contents!.data}>
                      {(item) => (
                        <MediaCard
                          id={item.id}
                          type={item.type}
                          name={item.attributes.name}
                          subtitle={item.attributes.artistName || item.attributes.curatorName || ''}
                          artwork={item.attributes.artwork}
                          onPlay={() => handlePlay(item.type, item.id)}
                        />
                      )}
                    </For>
                  </div>
                </section>
              </Show>
            )}
          </For>

          {/* Playlists */}
          <Show when={libraryStore.state().playlists.length > 0}>
            <section>
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold text-white">Your Playlists</h2>
                <A href="/library/playlists" class="text-sm text-apple-red hover:underline">
                  See All
                </A>
              </div>
              <div class="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                <For each={libraryStore.state().playlists.slice(0, 10)}>
                  {(playlist) => (
                    <MediaCard
                      id={playlist.id}
                      type={playlist.type}
                      name={playlist.attributes.name}
                      subtitle="Playlist"
                      artwork={playlist.attributes.artwork}
                      onPlay={() => playerStore.playPlaylist(playlist.id)}
                    />
                  )}
                </For>
              </div>
            </section>
          </Show>
        </Show>
      </Show>
    </div>
  );
};

interface MediaCardProps {
  id: string;
  type: string;
  name: string;
  subtitle: string;
  artwork?: { url: string; width: number; height: number };
  onPlay: () => void;
}

const MediaCard: Component<MediaCardProps> = (props) => {
  const link = () => {
    if (props.type.includes('album')) return `/album/${props.id}`;
    if (props.type.includes('playlist')) return `/playlist/${props.id}`;
    if (props.type.includes('artist')) return `/artist/${props.id}`;
    return '#';
  };

  return (
    <div class="w-44 flex-shrink-0 group">
      <A href={link()} class="block">
        <div class="relative aspect-square mb-2">
          <Show
            when={props.artwork}
            fallback={
              <div class="w-full h-full bg-gradient-to-br from-apple-red to-apple-pink rounded-lg flex items-center justify-center">
                <span class="text-4xl text-white">♫</span>
              </div>
            }
          >
            <img
              src={formatArtworkUrl(props.artwork, 352)}
              alt={props.name}
              class="w-full h-full object-cover rounded-lg album-shadow"
            />
          </Show>

          {/* Play overlay */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              props.onPlay();
            }}
            class="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center"
          >
            <div class="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center hover:scale-105 transition-transform">
              <svg class="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>
        </div>
      </A>
      <A href={link()}>
        <p class="text-sm font-medium text-white truncate hover:underline">{props.name}</p>
      </A>
      <p class="text-xs text-white/60 truncate">{props.subtitle}</p>
    </div>
  );
};

export default ForYou;
