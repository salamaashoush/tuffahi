import { Component, createEffect, createSignal, Show } from 'solid-js';
import { ratingsStore, type RatingValue } from '../../stores/ratings';
import { musicKitStore } from '../../stores/musickit';

interface HeartButtonProps {
  type: 'songs' | 'albums' | 'playlists';
  id: string;
  size?: 'sm' | 'md' | 'lg';
  class?: string;
  skipFetch?: boolean;
}

const HeartButton: Component<HeartButtonProps> = (props) => {
  const [isLoading, setIsLoading] = createSignal(false);

  const sizeClass = () => {
    switch (props.size ?? 'md') {
      case 'sm': return 'w-4 h-4';
      case 'md': return 'w-5 h-5';
      case 'lg': return 'w-6 h-6';
    }
  };

  // Fetch rating on mount / when id changes
  // Only fetch when the button becomes visible (authorized), not eagerly for every track
  createEffect(() => {
    if (props.id && musicKitStore.isAuthorized() && !props.skipFetch) {
      ratingsStore.fetchRating(props.type, props.id);
    }
  });

  const isLoved = () => ratingsStore.getRating(props.type, props.id) === 1;

  const handleClick = async (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isLoading() || !musicKitStore.isAuthorized()) return;

    setIsLoading(true);
    try {
      await ratingsStore.toggleLove(props.type, props.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Show when={musicKitStore.isAuthorized()}>
      <button
        onClick={handleClick}
        disabled={isLoading()}
        class={`transition-smooth disabled:opacity-50 ${props.class ?? ''} ${
          isLoved() ? 'text-apple-red' : 'text-white/40 hover:text-white/80'
        }`}
        title={isLoved() ? 'Remove Love' : 'Love'}
      >
        <Show
          when={isLoved()}
          fallback={
            <svg class={sizeClass()} fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          }
        >
          <svg class={sizeClass()} fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </Show>
      </button>
    </Show>
  );
};

export default HeartButton;
