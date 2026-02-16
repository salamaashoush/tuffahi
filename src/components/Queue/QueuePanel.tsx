import { Component, For, Show, createSignal, createMemo } from 'solid-js';
import { musicKitStore } from '../../stores/musickit';
import { playerStore } from '../../stores/player';
import { formatArtworkUrl } from '../../lib/musickit';

interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_UP_NEXT = 50;
const MAX_HISTORY = 20;

const QueuePanel: Component<QueuePanelProps> = (props) => {
  const [draggedIndex, setDraggedIndex] = createSignal<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = createSignal<number | null>(null);
  const [showAllUpNext, setShowAllUpNext] = createSignal(false);
  const [showAllHistory, setShowAllHistory] = createSignal(false);

  const queue = () => playerStore.state().queue;
  const nowPlaying = () => playerStore.state().nowPlaying;

  const currentIndex = createMemo(() => {
    const np = nowPlaying();
    const q = queue();
    if (!np || q.length === 0) return -1;
    return q.findIndex((item) => item?.id === np.id);
  });

  const fullHistory = createMemo(() => {
    const idx = currentIndex();
    if (idx <= 0) return [];
    return queue().slice(0, idx);
  });

  const history = createMemo(() => {
    const h = fullHistory();
    if (showAllHistory() || h.length <= MAX_HISTORY) return h;
    return h.slice(h.length - MAX_HISTORY);
  });

  const fullUpNext = createMemo(() => {
    const idx = currentIndex();
    const q = queue();
    if (idx === -1) return q;
    return q.slice(idx + 1);
  });

  const upNext = createMemo(() => {
    const u = fullUpNext();
    if (showAllUpNext() || u.length <= MAX_UP_NEXT) return u;
    return u.slice(0, MAX_UP_NEXT);
  });

  const handlePlayFromQueue = async (queueIndex: number) => {
    const mk = musicKitStore.instance();
    if (!mk) return;

    try {
      await mk.changeToMediaAtIndex(queueIndex);
    } catch (err) {
      console.error('Failed to play from queue:', err);
    }
  };

  const handleRemoveFromQueue = async (queueIndex: number) => {
    const ci = currentIndex();
    if (queueIndex === ci) {
      const mk = musicKitStore.instance();
      if (mk) await mk.skipToNextItem();
      return;
    }
    playerStore.removeFromQueue(queueIndex);
  };

  const handleClearQueue = async () => {
    const mk = musicKitStore.instance() as any;
    if (!mk) return;

    try {
      await mk.stop();
      if (mk.queue && typeof mk.queue.reset === 'function') {
        mk.queue.reset();
      } else if (typeof mk.clearQueue === 'function') {
        await mk.clearQueue();
      } else {
        await mk.setQueue({ songs: [] });
      }
      playerStore.clearQueueState();
    } catch (err) {
      console.error('Failed to clear queue:', err);
      playerStore.clearQueueState();
    }
  };

  const handleDragStart = (e: DragEvent, index: number) => {
    setDraggedIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    setDragOverIndex(index);
  };

  const handleDrop = (e: DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = draggedIndex();
    setDraggedIndex(null);
    setDragOverIndex(null);

    if (fromIndex === null || fromIndex === toIndex) return;

    // Convert upNext indices to full queue indices
    const ci = currentIndex();
    const fromQueueIdx = ci + 1 + fromIndex;
    const toQueueIdx = ci + 1 + toIndex;

    playerStore.reorderQueue(fromQueueIdx, toQueueIdx);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div
      class={`flex-shrink-0 bg-surface border-l border-white/10 transition-all duration-300 overflow-hidden ${
        props.isOpen ? 'w-80' : 'w-0'
      }`}
    >
      <div class="w-80 min-w-80 h-full flex flex-col">
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
        <div class="flex-1 overflow-y-auto">
          {/* Now Playing */}
          <Show when={nowPlaying()}>
            {(np) => (
              <div class="p-4 border-b border-white/10">
                <p class="text-xs text-white/40 uppercase tracking-wider mb-3">Now Playing</p>
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 flex-shrink-0">
                    <Show
                      when={np().attributes.artwork}
                      fallback={
                        <div class="w-full h-full bg-surface-secondary rounded-sm flex items-center justify-center">
                          <span class="text-white/20">&#9835;</span>
                        </div>
                      }
                    >
                      <img
                        src={formatArtworkUrl(np().attributes.artwork, 96)}
                        alt=""
                        class="w-full h-full object-cover rounded-sm"
                      />
                    </Show>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-apple-red truncate">
                      {np().attributes.name}
                    </p>
                    <p class="text-xs text-white/60 truncate">
                      {np().attributes.artistName}
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
          <Show when={fullUpNext().length > 0}>
            <div class="p-4">
              <div class="flex items-center justify-between mb-3">
                <p class="text-xs text-white/40 uppercase tracking-wider">
                  Playing Next ({fullUpNext().length})
                </p>
                <Show when={fullUpNext().length > MAX_UP_NEXT && !showAllUpNext()}>
                  <button
                    onClick={() => setShowAllUpNext(true)}
                    class="text-xs text-brand hover:text-brand/80 transition-smooth"
                  >
                    Show all
                  </button>
                </Show>
              </div>
              <div class="space-y-1">
                <For each={upNext()}>
                  {(track, index) => {
                    const queueIdx = () => currentIndex() + 1 + index();

                    return (
                      <div
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, index())}
                        onDragOver={(e) => handleDragOver(e, index())}
                        onDrop={(e) => handleDrop(e, index())}
                        onDragEnd={handleDragEnd}
                        class={`flex items-center gap-3 p-2 rounded-lg group cursor-grab active:cursor-grabbing transition-smooth ${
                          dragOverIndex() === index()
                            ? 'bg-white/15 border border-dashed border-white/30'
                            : draggedIndex() === index()
                            ? 'opacity-40'
                            : 'hover:bg-white/5'
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
                          onClick={() => handlePlayFromQueue(queueIdx())}
                          class="w-10 h-10 flex-shrink-0 relative group/play"
                        >
                          <Show
                            when={track.attributes.artwork}
                            fallback={
                              <div class="w-full h-full bg-surface-secondary rounded-sm flex items-center justify-center">
                                <span class="text-white/20 text-xs">&#9835;</span>
                              </div>
                            }
                          >
                            <img
                              src={formatArtworkUrl(track.attributes.artwork, 80)}
                              alt=""
                              class="w-full h-full object-cover rounded-sm"
                            />
                          </Show>
                          <div class="absolute inset-0 bg-black/50 rounded-sm opacity-0 group-hover/play:opacity-100 transition-smooth flex items-center justify-center">
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFromQueue(queueIdx());
                          }}
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
          <Show when={fullHistory().length > 0}>
            <div class="p-4 border-t border-white/10">
              <div class="flex items-center justify-between mb-3">
                <p class="text-xs text-white/40 uppercase tracking-wider">
                  History ({fullHistory().length})
                </p>
                <Show when={fullHistory().length > MAX_HISTORY && !showAllHistory()}>
                  <button
                    onClick={() => setShowAllHistory(true)}
                    class="text-xs text-brand hover:text-brand/80 transition-smooth"
                  >
                    Show all
                  </button>
                </Show>
              </div>
              <div class="space-y-1">
                <For each={history()}>
                  {(track, index) => {
                    const historyOffset = () => fullHistory().length - history().length;
                    return (
                    <button
                      onClick={() => handlePlayFromQueue(historyOffset() + index())}
                      class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-smooth group text-left opacity-60 hover:opacity-100"
                    >
                      <div class="w-10 h-10 flex-shrink-0">
                        <Show
                          when={track.attributes.artwork}
                          fallback={
                            <div class="w-full h-full bg-surface-secondary rounded-sm flex items-center justify-center">
                              <span class="text-white/20 text-xs">&#9835;</span>
                            </div>
                          }
                        >
                          <img
                            src={formatArtworkUrl(track.attributes.artwork, 80)}
                            alt=""
                            class="w-full h-full object-cover rounded-sm"
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
                    );
                  }}
                </For>
              </div>
            </div>
          </Show>

          {/* Empty State */}
          <Show when={!nowPlaying() && fullUpNext().length === 0}>
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
    </div>
  );
};

export default QueuePanel;
