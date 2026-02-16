import { Component, Show } from 'solid-js';
import { playerStore } from '../../stores/player';
import { formatArtworkUrl, formatDuration } from '../../lib/musickit';

interface MusicVideoCardProps {
  video: any;
  /** All video IDs in the list, for queueing next/prev */
  allVideoIds?: string[];
  /** Index of this video in allVideoIds */
  index?: number;
}

const MusicVideoCard: Component<MusicVideoCardProps> = (props) => {
  const handlePlay = () => {
    if (props.allVideoIds && props.allVideoIds.length > 1) {
      playerStore.playMusicVideos(props.allVideoIds, props.index ?? 0);
    } else {
      playerStore.playMedia('music-videos', props.video.id);
    }
  };

  return (
    <button
      onClick={handlePlay}
      class="flex-shrink-0 w-64 group text-left"
    >
      <div class="relative aspect-video mb-2 rounded-lg overflow-hidden">
        <Show
          when={props.video.attributes?.artwork}
          fallback={
            <div class="w-full h-full bg-surface-secondary flex items-center justify-center">
              <svg class="w-12 h-12 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
              </svg>
            </div>
          }
        >
          <img
            src={formatArtworkUrl(props.video.attributes.artwork, 512)}
            alt={props.video.attributes?.name}
            class="w-full h-full object-cover"
          />
        </Show>

        {/* Play overlay */}
        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center">
          <div class="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Duration badge */}
        <Show when={props.video.attributes?.durationInMillis}>
          <div class="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 rounded text-xs text-white font-medium">
            {formatDuration(props.video.attributes.durationInMillis)}
          </div>
        </Show>
      </div>

      <p class="text-sm font-medium text-white truncate">{props.video.attributes?.name}</p>
      <p class="text-xs text-white/60 truncate">{props.video.attributes?.artistName}</p>
    </button>
  );
};

export default MusicVideoCard;
