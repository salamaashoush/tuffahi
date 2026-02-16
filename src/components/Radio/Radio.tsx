import { Component, createResource, createSignal, For, Show } from 'solid-js';
import { musicKitStore } from '../../stores/musickit';
import { playerStore } from '../../stores/player';
import { formatArtworkUrl } from '../../lib/musickit';

interface Station {
  id: string;
  type: string;
  attributes: {
    name: string;
    artwork?: { url: string; width: number; height: number };
    editorialNotes?: {
      short?: string;
      standard?: string;
    };
    isLive?: boolean;
  };
}

interface RadioData {
  liveStations: Station[];
  featuredStations: Station[];
  genreStations: Station[];
}

const Radio: Component = () => {
  const [currentlyPlayingId, setCurrentlyPlayingId] = createSignal<string | null>(null);

  const [radioData] = createResource(
    () => musicKitStore.instance(),
    async (mk): Promise<RadioData> => {
      // Fetch Apple Music 1, Hits, Country (known live station IDs)
      const knownLiveIds = ['ra.978484891', 'ra.1498157166', 'ra.1498157150'];
      const [liveResponse, featuredResponse] = await Promise.all([
        mk.api.music(`/v1/catalog/{{storefrontId}}/stations`, {
          ids: knownLiveIds.join(','),
        }).catch(() => null),
        mk.api.music('/v1/catalog/{{storefrontId}}/search', {
          term: 'station',
          types: 'stations',
          limit: 25,
        }).catch(() => null),
      ]);

      const liveStations: Station[] = liveResponse
        ? ((liveResponse.data as { data: Station[] }).data || [])
        : [];

      const liveIds = new Set(liveStations.map((s) => s.id));
      const featuredStations: Station[] = featuredResponse
        ? ((featuredResponse.data as { results?: { stations?: { data: Station[] } } }).results?.stations?.data || []).filter((s) => !liveIds.has(s.id))
        : [];

      return { liveStations, featuredStations, genreStations: [] };
    }
  );

  const handlePlayStation = async (station: Station) => {
    const mk = musicKitStore.instance();
    if (!mk) return;

    try {
      setCurrentlyPlayingId(station.id);
      await mk.setQueue({ station: station.id });
      await mk.play();
    } catch (err) {
      console.error('Failed to play station:', err);
      setCurrentlyPlayingId(null);
    }
  };

  const isPlaying = (stationId: string) => {
    return currentlyPlayingId() === stationId && playerStore.state().isPlaying;
  };

  return (
    <div class="space-y-10 pb-8">
      <div>
        <h1 class="text-3xl font-bold text-white mb-2">Radio</h1>
        <p class="text-white/60">The best way to discover new music</p>
      </div>

      <Show when={radioData.error}>
        <div class="bg-red-500/20 border border-red-500/40 rounded-lg p-4">
          <p class="text-red-400">{radioData.error?.message || 'Failed to load stations'}</p>
        </div>
      </Show>

      <Show
        when={!radioData.loading}
        fallback={
          <div class="space-y-10">
            <div>
              <div class="h-6 bg-surface-secondary rounded-sm w-48 mb-4 animate-pulse" />
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <For each={Array(3).fill(0)}>
                  {() => (
                    <div class="aspect-[2/1] bg-surface-secondary rounded-xl animate-pulse" />
                  )}
                </For>
              </div>
            </div>
          </div>
        }
      >
        {/* Apple Music Live Stations */}
        <Show when={(radioData()?.liveStations?.length ?? 0) > 0}>
          <section>
            <div class="flex items-center gap-2 mb-4">
              <h2 class="text-xl font-semibold text-white">Apple Music Radio</h2>
              <span class="px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full uppercase">
                Live
              </span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <For each={radioData()?.liveStations}>
                {(station) => (
                  <LiveStationCard
                    station={station}
                    isPlaying={isPlaying(station.id)}
                    onPlay={() => handlePlayStation(station)}
                  />
                )}
              </For>
            </div>
          </section>
        </Show>

        {/* Featured Stations */}
        <Show when={(radioData()?.featuredStations?.length ?? 0) > 0}>
          <section>
            <h2 class="text-xl font-semibold text-white mb-4">Featured Stations</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <For each={radioData()?.featuredStations}>
                {(station) => (
                  <StationCard
                    station={station}
                    isPlaying={isPlaying(station.id)}
                    onPlay={() => handlePlayStation(station)}
                  />
                )}
              </For>
            </div>
          </section>
        </Show>

        {/* Genre Stations */}
        <Show when={(radioData()?.genreStations?.length ?? 0) > 0}>
          <section>
            <h2 class="text-xl font-semibold text-white mb-4">Stations by Genre</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <For each={radioData()?.genreStations}>
                {(station) => (
                  <StationCard
                    station={station}
                    isPlaying={isPlaying(station.id)}
                    onPlay={() => handlePlayStation(station)}
                  />
                )}
              </For>
            </div>
          </section>
        </Show>

        {/* Empty State */}
        <Show when={!radioData()?.liveStations?.length && !radioData()?.featuredStations?.length && !radioData()?.genreStations?.length && !radioData.error}>
          <div class="flex flex-col items-center justify-center py-20">
            <div class="w-20 h-20 rounded-full bg-surface-secondary flex items-center justify-center mb-4">
              <svg class="w-10 h-10 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H8.3l8.26-3.34L15.88 1 3.24 6.15zM7 20c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-8h-2v-2h-2v2H4V8h16v4z" />
              </svg>
            </div>
            <h2 class="text-xl font-semibold text-white mb-2">No Stations Available</h2>
            <p class="text-white/60 text-center">
              Radio stations require an Apple Music subscription
            </p>
          </div>
        </Show>
      </Show>
    </div>
  );
};

interface StationCardProps {
  station: Station;
  isPlaying: boolean;
  onPlay: () => void;
}

const LiveStationCard: Component<StationCardProps> = (props) => (
  <button
    onClick={props.onPlay}
    class="relative aspect-[2/1] rounded-xl overflow-hidden group"
  >
    <Show
      when={props.station.attributes.artwork}
      fallback={
        <div class="w-full h-full bg-gradient-to-br from-apple-red to-purple-600" />
      }
    >
      <img
        src={formatArtworkUrl(props.station.attributes.artwork, 600)}
        alt={props.station.attributes.name}
        class="w-full h-full object-cover"
      />
    </Show>

    {/* Overlay */}
    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

    {/* Content */}
    <div class="absolute inset-0 p-4 flex flex-col justify-end">
      <div class="flex items-center gap-2 mb-1">
        <Show when={props.station.attributes.isLive}>
          <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </Show>
        <span class="text-xs text-white/80 uppercase tracking-wider">Live</span>
      </div>
      <h3 class="text-lg font-bold text-white">{props.station.attributes.name}</h3>
      <Show when={props.station.attributes.editorialNotes?.short}>
        <p class="text-sm text-white/60 line-clamp-1">
          {props.station.attributes.editorialNotes?.short}
        </p>
      </Show>
    </div>

    {/* Play Button */}
    <div class={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
      props.isPlaying
        ? 'bg-white'
        : 'bg-white/20 opacity-0 group-hover:opacity-100'
    }`}>
      <Show
        when={props.isPlaying}
        fallback={
          <svg class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        }
      >
        <div class="flex items-center gap-0.5">
          <span class="w-0.5 h-3 bg-apple-red rounded-full animate-pulse" />
          <span class="w-0.5 h-4 bg-apple-red rounded-full animate-pulse" style={{ "animation-delay": "0.2s" }} />
          <span class="w-0.5 h-2 bg-apple-red rounded-full animate-pulse" style={{ "animation-delay": "0.4s" }} />
        </div>
      </Show>
    </div>
  </button>
);

const StationCard: Component<StationCardProps> = (props) => (
  <button
    onClick={props.onPlay}
    class="group text-left"
  >
    <div class="relative aspect-square mb-2">
      <Show
        when={props.station.attributes.artwork}
        fallback={
          <div class="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <svg class="w-12 h-12 text-white/60" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H8.3l8.26-3.34L15.88 1 3.24 6.15zM7 20c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-8h-2v-2h-2v2H4V8h16v4z" />
            </svg>
          </div>
        }
      >
        <img
          src={formatArtworkUrl(props.station.attributes.artwork, 300)}
          alt={props.station.attributes.name}
          class="w-full h-full object-cover rounded-lg"
        />
      </Show>

      {/* Play overlay */}
      <div class={`absolute inset-0 rounded-lg flex items-center justify-center transition-all ${
        props.isPlaying
          ? 'bg-black/40'
          : 'bg-black/40 opacity-0 group-hover:opacity-100'
      }`}>
        <div class={`w-12 h-12 rounded-full flex items-center justify-center ${
          props.isPlaying ? 'bg-white' : 'bg-white/90'
        }`}>
          <Show
            when={props.isPlaying}
            fallback={
              <svg class="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            }
          >
            <div class="flex items-center gap-0.5">
              <span class="w-0.5 h-3 bg-apple-red rounded-full animate-pulse" />
              <span class="w-0.5 h-4 bg-apple-red rounded-full animate-pulse" style={{ "animation-delay": "0.2s" }} />
              <span class="w-0.5 h-2 bg-apple-red rounded-full animate-pulse" style={{ "animation-delay": "0.4s" }} />
            </div>
          </Show>
        </div>
      </div>
    </div>

    <p class="text-sm font-medium text-white truncate">{props.station.attributes.name}</p>
  </button>
);

export default Radio;
