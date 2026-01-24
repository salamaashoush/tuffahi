import { Component, For, Show, createSignal, createEffect } from 'solid-js';
import { musicKitStore } from '../../stores/musickit';
import { playerStore } from '../../stores/player';
import { formatArtworkUrl, formatDuration } from '../../lib/musickit';

interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const QueuePanel: Component<QueuePanelProps> = (props) => {
  const [history, setHistory] = createSignal<MusicKit.MediaItem[]>([]);
  const [upNext, setUpNext] = createSignal<MusicKit.MediaItem[]>([]);
  const [draggedIndex, setDraggedIndex] = createSignal<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = createSignal<number | null>(null);

  createEffect(() => {
    const queue = playerStore.state().queue;
    const nowPlaying = playerStore.state().nowPlaying;

    if (!nowPlaying || queue.length === 0) {
      setHistory([]);
      setUpNext([]);
      return;
    }

    const currentIndex = queue.findIndex((item) => item.id === nowPlaying.id);
    if (currentIndex === -1) {
      setHistory([]);
      setUpNext(queue);
    } else {
      setHistory(queue.slice(0, currentIndex));
      setUpNext(queue.slice(currentIndex + 1));
    }
  });

  const handlePlayFromQueue = async (index: number) => {
    const mk = musicKitStore.instance();
    if (!mk) return;

    try {
      await mk.changeToMediaAtIndex(index);
    } catch (err) {
      console.error('Failed to play from queue:', err);
    }
  };

  const handleRemoveFromQueue = async (index: number) => {
    const mk = musicKitStore.instance();
    if (!mk) return;

    try {
      // MusicKit doesn't have a direct remove method, we'd need to rebuild the queue
      // For now, we'll skip to next if removing current
      const queue = mk.queue;
      if (index === queue.position) {
        await mk.skipToNextItem();
      }
    } catch (err) {
      console.error('Failed to remove from queue:', err);
    }
  };

  const handleClearQueue = async () => {
    const mk = musicKitStore.instance();
    if (!mk) return;

    try {
      await mk.stop();
      await mk.setQueue({ songs: [] });
    } catch (err) {
      console.error('Failed to clear queue:', err);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    // TODO: Implement queue reordering via MusicKit API
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const currentlyPlayingTrackId = () => playerStore.state().nowPlaying?.id;

  return (
    <div
      class={`fixed right-0 top-0 bottom-24 w-80 bg-surface border-l border-white/10 transform transition-transform duration-300 z-40 ${
        props.isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div class="flex items-center justify-between p-4 border-b border-white/10">
        <h2 class="text-lg font-semibold text-white">Queue</h2>
        <div class="flex items-center gap-2">
          <button
            onClick={handleClearQueue}
            class="text-sm text-white/60 hover:text-white transition-smooth"
          >
            Clear
          </button>
          <button
            onClick={props.onClose}
            class="p-1 text-white/60 hover:text-white transition-smooth"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Queue Content */}
      <div class="h-full overflow-y-auto pb-20">
        {/* Now Playing */}
        <Show when={playerStore.state().nowPlaying}>
          {(nowPlaying) => (
            <div class="p-4 border-b border-white/10">
              <p class="text-xs text-white/40 uppercase tracking-wider mb-3">Now Playing</p>
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 flex-shrink-0">
                  <Show
                    when={nowPlaying().attributes.artwork}
                    fallback={
                      <div class="w-full h-full bg-surface-secondary rounded flex items-center justify-center">
                        <span class="text-white/20">♫</span>
                      </div>
                    }
                  >
                    <img
                      src={formatArtworkUrl(nowPlaying().attributes.artwork, 96)}
                      alt=""
                      class="w-full h-full object-cover rounded"
                    />
                  </Show>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-apple-red truncate">
                    {nowPlaying().attributes.name}
                  </p>
                  <p class="text-xs text-white/60 truncate">
                    {nowPlaying().attributes.artistName}
                  </p>
                </div>
                <div class="flex items-center gap-0.5">
                  <span class="w-0.5 h-3 bg-apple-red rounded-full animate-pulse" />
                  <span class="w-0.5 h-4 bg-apple-red rounded-full animate-pulse" style={{ "animation-delay": "0.2s" }} />
                  <span class="w-0.5 h-2 bg-apple-red rounded-full animate-pulse" style={{ "animation-delay": "0.4s" }} />
                </div>
              </div>
            </div>
          )}
        </Show>

        {/* Playing Next */}
        <Show when={upNext().length > 0}>
          <div class="p-4">
            <p class="text-xs text-white/40 uppercase tracking-wider mb-3">
              Playing Next ({upNext().length})
            </p>
            <div class="space-y-1">
              <For each={upNext()}>
                {(track, index) => {
                  const actualIndex = () => history().length + 1 + index();

                  return (
                    <div
                      draggable={true}
                      onDragStart={() => handleDragStart(index())}
                      onDragOver={(e) => handleDragOver(e, index())}
                      onDragEnd={handleDragEnd}
                      class={`flex items-center gap-3 p-2 rounded-lg group cursor-grab active:cursor-grabbing transition-smooth ${
                        dragOverIndex() === index() ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                    >
                      {/* Drag Handle */}
                      <div class="text-white/20 group-hover:text-white/40">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </div>

                      {/* Track Artwork */}
                      <button
                        onClick={() => handlePlayFromQueue(actualIndex())}
                        class="w-10 h-10 flex-shrink-0 relative group/play"
                      >
                        <Show
                          when={track.attributes.artwork}
                          fallback={
                            <div class="w-full h-full bg-surface-secondary rounded flex items-center justify-center">
                              <span class="text-white/20 text-xs">♫</span>
                            </div>
                          }
                        >
                          <img
                            src={formatArtworkUrl(track.attributes.artwork, 80)}
                            alt=""
                            class="w-full h-full object-cover rounded"
                          />
                        </Show>
                        <div class="absolute inset-0 bg-black/50 rounded opacity-0 group-hover/play:opacity-100 transition-smooth flex items-center justify-center">
                          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </button>

                      {/* Track Info */}
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-white truncate">
                          {track.attributes.name}
                        </p>
                        <p class="text-xs text-white/60 truncate">
                          {track.attributes.artistName}
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveFromQueue(actualIndex())}
                        class="p-1 text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-smooth"
                        title="Remove"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
        </Show>

        {/* History */}
        <Show when={history().length > 0}>
          <div class="p-4 border-t border-white/10">
            <p class="text-xs text-white/40 uppercase tracking-wider mb-3">
              History ({history().length})
            </p>
            <div class="space-y-1">
              <For each={history()}>
                {(track, index) => (
                  <button
                    onClick={() => handlePlayFromQueue(index())}
                    class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-smooth group text-left opacity-60 hover:opacity-100"
                  >
                    <div class="w-10 h-10 flex-shrink-0">
                      <Show
                        when={track.attributes.artwork}
                        fallback={
                          <div class="w-full h-full bg-surface-secondary rounded flex items-center justify-center">
                            <span class="text-white/20 text-xs">♫</span>
                          </div>
                        }
                      >
                        <img
                          src={formatArtworkUrl(track.attributes.artwork, 80)}
                          alt=""
                          class="w-full h-full object-cover rounded"
                        />
                      </Show>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-white truncate">
                        {track.attributes.name}
                      </p>
                      <p class="text-xs text-white/60 truncate">
                        {track.attributes.artistName}
                      </p>
                    </div>
                  </button>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Empty State */}
        <Show when={!playerStore.state().nowPlaying && upNext().length === 0}>
          <div class="flex flex-col items-center justify-center h-64 text-center px-4">
            <div class="w-16 h-16 mb-4 rounded-full bg-surface-secondary flex items-center justify-center">
              <svg class="w-8 h-8 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
              </svg>
            </div>
            <p class="text-white/60">Your queue is empty</p>
            <p class="text-sm text-white/40 mt-1">
              Add songs to start listening
            </p>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default QueuePanel;
