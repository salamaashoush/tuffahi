import { Component, createSignal, Show } from 'solid-js';
import { ratingsStore } from '../../stores/ratings';
import { musicKitStore } from '../../stores/musickit';

interface DislikeButtonProps {
  type: 'songs' | 'albums' | 'playlists';
  id: string;
  size?: 'sm' | 'md' | 'lg';
  class?: string;
}

const DislikeButton: Component<DislikeButtonProps> = (props) => {
  const [isLoading, setIsLoading] = createSignal(false);

  const sizeClass = () => {
    switch (props.size ?? 'md') {
      case 'sm': return 'w-4 h-4';
      case 'md': return 'w-5 h-5';
      case 'lg': return 'w-6 h-6';
    }
  };

  const isDisliked = () => ratingsStore.getRating(props.type, props.id) === -1;

  const handleClick = async (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isLoading() || !musicKitStore.isAuthorized()) return;

    setIsLoading(true);
    try {
      await ratingsStore.toggleDislike(props.type, props.id);
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
          isDisliked() ? 'text-white' : 'text-white/40 hover:text-white/80'
        }`}
        title={isDisliked() ? 'Remove Dislike' : 'Dislike'}
      >
        <svg class={sizeClass()} fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.5 2.25 2.25 0 0 0 9.75 21.75c.087 0 .175.002.261-.008a.735.735 0 0 0 .599-.695c.063-.791.218-1.554.446-2.275a2.5 2.5 0 0 1 1.194-1.476L14.5 15.93a4.5 4.5 0 0 0 2.038-2.506l.474-1.418a.859.859 0 0 0-.36-.963l-.188-.123a3.043 3.043 0 0 0-1.684-.51H12.5"
            fill={isDisliked() ? 'currentColor' : 'none'}
          />
        </svg>
      </button>
    </Show>
  );
};

export default DislikeButton;
