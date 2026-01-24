import { Component, createSignal, createEffect, For, Show } from 'solid-js';
import { playerStore } from '../../stores/player';
import { musicKitStore } from '../../stores/musickit';
import { formatArtworkUrl } from '../../lib/musickit';

interface LyricLine {
  startTime: number;
  endTime: number;
  text: string;
}

const Lyrics: Component = () => {
  const [lyrics, setLyrics] = createSignal<LyricLine[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [activeLine, setActiveLine] = createSignal(-1);

  // Fetch lyrics when song changes
  createEffect(async () => {
    const nowPlaying = playerStore.state().nowPlaying;
    if (!nowPlaying) {
      setLyrics([]);
      return;
    }

    const mk = musicKitStore.instance();
    if (!mk || !musicKitStore.isAuthorized()) return;

    // Check if song has lyrics
    if (!nowPlaying.attributes.hasLyrics) {
      setLyrics([]);
      setError('No lyrics available for this song');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch lyrics from Apple Music API
      const response = await mk.api.music(
        `/v1/catalog/us/songs/${nowPlaying.id}/lyrics`
      );

      const data = response.data as {
        data: {
          attributes: {
            ttml: string;
          };
        }[];
      };

      // Parse TTML lyrics (simplified parsing)
      const ttml = data.data?.[0]?.attributes?.ttml;
      if (ttml) {
        const parsedLyrics = parseTTML(ttml);
        setLyrics(parsedLyrics);
      } else {
        setLyrics([]);
        setError('Lyrics not available');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lyrics');
      setLyrics([]);
    } finally {
      setIsLoading(false);
    }
  });

  // Update active line based on playback time
  createEffect(() => {
    const currentTime = playerStore.state().currentTime;
    const currentLyrics = lyrics();

    if (currentLyrics.length === 0) return;

    const currentTimeMs = currentTime * 1000;
    let newActiveLine = -1;

    for (let i = 0; i < currentLyrics.length; i++) {
      if (currentTimeMs >= currentLyrics[i].startTime && currentTimeMs < currentLyrics[i].endTime) {
        newActiveLine = i;
        break;
      }
    }

    setActiveLine(newActiveLine);
  });

  const nowPlaying = () => playerStore.state().nowPlaying;

  return (
    <div class="h-full flex flex-col">
      {/* Header */}
      <div class="flex items-center gap-4 mb-6">
        <Show when={nowPlaying()}>
          {(item) => (
            <>
              <div class="w-16 h-16 rounded-lg overflow-hidden album-shadow">
                <img
                  src={formatArtworkUrl(item().attributes.artwork, 128)}
                  alt={item().attributes.albumName}
                  class="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 class="text-xl font-semibold text-white">{item().attributes.name}</h2>
                <p class="text-white/60">{item().attributes.artistName}</p>
              </div>
            </>
          )}
        </Show>
        <Show when={!nowPlaying()}>
          <div class="text-white/40">No song playing</div>
        </Show>
      </div>

      {/* Lyrics Content */}
      <div class="flex-1 overflow-y-auto">
        <Show when={error()}>
          <div class="text-center py-12">
            <p class="text-white/40">{error()}</p>
          </div>
        </Show>

        <Show when={isLoading()}>
          <div class="space-y-4 animate-pulse">
            <For each={Array(10).fill(0)}>
              {() => (
                <div class="h-8 bg-surface-secondary rounded w-3/4" />
              )}
            </For>
          </div>
        </Show>

        <Show when={!isLoading() && !error() && lyrics().length > 0}>
          <div class="space-y-4 pb-20">
            <For each={lyrics()}>
              {(line, index) => (
                <p
                  class={`text-2xl font-medium transition-all duration-300 ${
                    index() === activeLine()
                      ? 'text-white scale-105 origin-left'
                      : index() < activeLine()
                      ? 'text-white/30'
                      : 'text-white/50'
                  }`}
                >
                  {line.text || '\u00A0'}
                </p>
              )}
            </For>
          </div>
        </Show>

        <Show when={!isLoading() && !error() && lyrics().length === 0 && nowPlaying()}>
          <div class="text-center py-12">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-secondary flex items-center justify-center">
              <svg class="w-8 h-8 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <p class="text-white/40">No lyrics available</p>
          </div>
        </Show>
      </div>
    </div>
  );
};

// Simple TTML parser for Apple Music lyrics
function parseTTML(ttml: string): LyricLine[] {
  const lines: LyricLine[] = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(ttml, 'text/xml');
    const paragraphs = doc.querySelectorAll('p');

    paragraphs.forEach((p) => {
      const begin = p.getAttribute('begin');
      const end = p.getAttribute('end');
      const text = p.textContent?.trim() || '';

      if (begin && end) {
        lines.push({
          startTime: parseTimeToMs(begin),
          endTime: parseTimeToMs(end),
          text,
        });
      }
    });
  } catch (err) {
    console.error('Failed to parse TTML:', err);
  }

  return lines;
}

// Parse time string (e.g., "00:01:23.456") to milliseconds
function parseTimeToMs(time: string): number {
  const parts = time.split(':');
  const [seconds, ms] = parts[parts.length - 1].split('.');

  let totalMs = parseFloat(seconds) * 1000;
  if (ms) {
    totalMs += parseFloat(`0.${ms}`) * 1000;
  }

  if (parts.length >= 2) {
    totalMs += parseInt(parts[parts.length - 2], 10) * 60 * 1000;
  }
  if (parts.length >= 3) {
    totalMs += parseInt(parts[parts.length - 3], 10) * 60 * 60 * 1000;
  }

  return totalMs;
}

export default Lyrics;
