import { Component, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { usePlayer } from '../../hooks/usePlayer';
import { formatArtworkUrl } from '../../lib/musickit';
import { musicKitStore } from '../../stores/musickit';
import { playerStore } from '../../stores/player';
import { searchAPI } from '../../services/api';
import Controls from './Controls';
import Progress from './Progress';
import Volume from './Volume';
import HeartButton from '../Rating/HeartButton';
import DislikeButton from '../Rating/DislikeButton';
import QualityBadge from '../QualityBadge/QualityBadge';

interface PlayerProps {
  onQueueClick: () => void;
  onNowPlayingClick: () => void;
}

const Player: Component<PlayerProps> = (props) => {
  const { state } = usePlayer();
  const navigate = useNavigate();

  const navigateToArtist = async (artistName: string) => {
    const artistId = await searchAPI.findArtistId(artistName);
    if (artistId) navigate(`/artist/${artistId}`);
  };

  return (
    <footer class="h-24 bg-surface border-t border-white/10 flex items-center px-4 gap-4">
      {/* Now Playing Info */}
      <div class="w-72 flex items-center gap-3">
        <Show when={state().nowPlaying}>
          {(item) => (
            <>
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={props.onNowPlayingClick}
                  class="w-14 h-14 rounded-lg overflow-hidden album-shadow-sm flex-shrink-0 hover:scale-105 transition-transform"
                >
                  <img
                    src={formatArtworkUrl(item().attributes.artwork, 112)}
                    alt={item().attributes.albumName}
                    class="w-full h-full object-cover"
                  />
                </button>
                <div class="min-w-0 flex-1">
                  <button
                    onClick={props.onNowPlayingClick}
                    class="flex items-center gap-1.5 max-w-full"
                  >
                    <p class="text-sm font-medium text-white truncate hover:underline">
                      {item().attributes.name}
                    </p>
                    <QualityBadge audioTraits={(item() as any).attributes.audioTraits} />
                  </button>
                  <p
                    class="text-xs text-white/60 truncate hover:text-white hover:underline cursor-pointer block"
                    onClick={() => navigateToArtist(item().attributes.artistName)}
                  >
                    {item().attributes.artistName}
                  </p>
                </div>
              </div>
              <HeartButton type="songs" id={item().id} size="sm" />
              <DislikeButton type="songs" id={item().id} size="sm" />
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
        {/* Speed Badge */}
        <Show when={playerStore.playbackRate() !== 1}>
          <button
            onClick={() => playerStore.setPlaybackRate(1)}
            class="text-xs font-medium px-1.5 py-0.5 rounded bg-white/10 text-white/80 hover:bg-white/20 transition-smooth"
            title="Reset speed to 1.0x"
          >
            {playerStore.playbackRate()}x
          </button>
        </Show>

        {/* AirPlay Button */}
        <Show when={typeof (musicKitStore.instance() as any)?.showPlaybackTargetPicker === 'function'}>
          <button
            onClick={() => {
              const mk = musicKitStore.instance() as any;
              mk?.showPlaybackTargetPicker?.();
            }}
            class="text-white/40 hover:text-white transition-smooth"
            title="AirPlay"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 22h12l-6-6zM21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v-2H3V5h18v12h-4v2h4c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
            </svg>
          </button>
        </Show>

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
          onClick={() => {
            window.electron.openMiniPlayer().catch((err: unknown) => {
              console.error('Failed to open mini player:', err);
            });
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
