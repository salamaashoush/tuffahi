import { Component, createResource, createEffect, createSignal, For, Show, onMount } from 'solid-js';
import { playerStore } from '../../stores/player';
import { catalogAPI } from '../../services/api';
import { parseTTML, findCurrentLine, type LyricLine } from '../../lib/ttml-parser';

interface LyricsViewProps {
  songId: string;
}

const LyricsView: Component<LyricsViewProps> = (props) => {
  const [currentLineIndex, setCurrentLineIndex] = createSignal(-1);
  let containerRef: HTMLDivElement | undefined;

  // Fetch lyrics for the current song
  const [lyrics] = createResource(
    () => props.songId,
    async (songId): Promise<LyricLine[]> => {
      if (!songId) return [];
      const ttml = await catalogAPI.getLyrics(songId);
      if (!ttml) return [];
      return parseTTML(ttml);
    }
  );

  // Track current time and update active line
  createEffect(() => {
    const lines = lyrics();
    if (!lines || lines.length === 0) return;

    const time = playerStore.currentTime();
    const index = findCurrentLine(lines, time);
    setCurrentLineIndex(index);
  });

  // Auto-scroll to current line
  createEffect(() => {
    const index = currentLineIndex();
    if (index < 0 || !containerRef) return;

    const lineEl = containerRef.querySelector(`[data-line="${index}"]`);
    if (lineEl) {
      lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  return (
    <div
      ref={containerRef}
      class="h-full overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-white/10"
    >
      <Show
        when={!lyrics.loading}
        fallback={
          <div class="flex items-center justify-center h-full">
            <div class="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        }
      >
        <Show
          when={lyrics() && lyrics()!.length > 0}
          fallback={
            <div class="flex items-center justify-center h-full text-white/40">
              <p class="text-sm">Lyrics not available</p>
            </div>
          }
        >
          <div class="space-y-4">
            <For each={lyrics()}>
              {(line, index) => {
                const isActive = () => currentLineIndex() === index();
                const isPast = () => {
                  const ci = currentLineIndex();
                  return ci >= 0 && index() < ci;
                };

                return (
                  <p
                    data-line={index()}
                    onClick={() => playerStore.seekTo(line.startTime)}
                    class={`text-lg font-semibold cursor-pointer transition-all duration-300 ${
                      isActive()
                        ? 'text-white scale-105 origin-left'
                        : isPast()
                          ? 'text-white/30'
                          : 'text-white/50 hover:text-white/70'
                    }`}
                  >
                    {/* Render syllables with fill animation if available */}
                    <Show
                      when={line.syllables.length > 0}
                      fallback={line.text}
                    >
                      <For each={line.syllables}>
                        {(syllable) => {
                          const progress = () => {
                            if (!isActive()) return isPast() ? 1 : 0;
                            const time = playerStore.currentTime();
                            if (time < syllable.startTime) return 0;
                            if (time >= syllable.endTime) return 1;
                            return (time - syllable.startTime) / (syllable.endTime - syllable.startTime);
                          };

                          return (
                            <span
                              class="relative inline"
                              style={{
                                background: isActive()
                                  ? `linear-gradient(90deg, white ${progress() * 100}%, rgba(255,255,255,0.5) ${progress() * 100}%)`
                                  : undefined,
                                '-webkit-background-clip': isActive() ? 'text' : undefined,
                                '-webkit-text-fill-color': isActive() ? 'transparent' : undefined,
                              }}
                            >
                              {syllable.text}
                            </span>
                          );
                        }}
                      </For>
                    </Show>
                  </p>
                );
              }}
            </For>
            {/* Bottom spacer for scroll */}
            <div class="h-32" />
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default LyricsView;
