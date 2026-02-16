import { Component, Show } from 'solid-js';
import { usePlayer } from '../../hooks/usePlayer';
import { formatArtworkUrl } from '../../lib/musickit';
import Controls from './Controls';
import Progress from './Progress';
import Volume from './Volume';
import HeartButton from '../Rating/HeartButton';
import QualityBadge from '../QualityBadge/QualityBadge';

interface PlayerProps {
  onQueueClick: () => void;
  onNowPlayingClick: () => void;
}

const Player: Component<PlayerProps> = (props) => {
  const { state } = usePlayer();

  return (
    <footer class="h-24 bg-surface border-t border-white/10 flex items-center px-4 gap-4">
      {/* Now Playing Info */}
      <div class="w-72 flex items-center gap-3">
        <Show when={state().nowPlaying}>
          {(item) => (
            <>
              <button
                onClick={props.onNowPlayingClick}
                class="flex items-center gap-3 text-left group"
              >
                <div class="w-14 h-14 rounded-lg overflow-hidden album-shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                  <img
                    src={formatArtworkUrl(item().attributes.artwork, 112)}
                    alt={item().attributes.albumName}
                    class="w-full h-full object-cover"
                  />
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <p class="text-sm font-medium text-white truncate group-hover:underline">
                      {item().attributes.name}
                    </p>
                    <QualityBadge audioTraits={(item() as any).attributes.audioTraits} />
                  </div>
                  <p class="text-xs text-white/60 truncate">
                    {item().attributes.artistName}
                  </p>
                </div>
              </button>
              <HeartButton type="songs" id={item().id} size="sm" />
            </>
          )}
        </Show>
        <Show when={!state().nowPlaying}>
          <div class="w-14 h-14 rounded-lg bg-surface-secondary flex items-center justify-center">
            <span class="text-white/20 text-2xl">♫</span>
          </div>
          <div class="min-w-0">
            <p class="text-sm text-white/40">Not Playing</p>
          </div>
        </Show>
      </div>

      {/* Center Controls & Progress */}
      <div class="flex-1 flex flex-col items-center gap-2">
        <Controls />
        <Progress />
      </div>

      {/* Right Side - Volume & Actions */}
      <div class="w-72 flex items-center justify-end gap-4">
        {/* Queue Button */}
        <button
          onClick={props.onQueueClick}
          class="text-white/40 hover:text-white transition-smooth"
          title="Queue"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
          </svg>
        </button>

        {/* Mini Player Button */}
        <button
          onClick={async () => {
            try {
              await window.electron.openMiniPlayer();
              await window.electron.hideMainWindow();
            } catch (err) {
              console.error('Failed to open mini player:', err);
            }
          }}
          class="text-white/40 hover:text-white transition-smooth"
          title="Mini Player"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z" />
          </svg>
        </button>

        <Volume />
      </div>
    </footer>
  );
};

export default Player;
