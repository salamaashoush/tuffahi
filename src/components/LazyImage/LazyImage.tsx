/**
 * Lazy Image Component
 * Loads images on demand with blur placeholder
 */

import { Component, createSignal, onMount, Show } from 'solid-js';

interface LazyImageProps {
  src: string;
  alt: string;
  class?: string;
  placeholderColor?: string;
  width?: number;
  height?: number;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: Component<LazyImageProps> = (props) => {
  const [isLoaded, setIsLoaded] = createSignal(false);
  const [hasError, setHasError] = createSignal(false);
  const [isInView, setIsInView] = createSignal(false);
  let imgRef: HTMLImageElement | undefined;
  let containerRef: HTMLDivElement | undefined;

  onMount(() => {
    if (!containerRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px' }
    );

    observer.observe(containerRef);

    return () => observer.disconnect();
  });

  const handleLoad = () => {
    setIsLoaded(true);
    props.onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    props.onError?.();
  };

  return (
    <div
      ref={containerRef}
      class={`relative overflow-hidden ${props.class || ''}`}
      style={{
        'background-color': props.placeholderColor || '#2c2c2e',
        width: props.width ? `${props.width}px` : undefined,
        height: props.height ? `${props.height}px` : undefined,
      }}
    >
      {/* Placeholder */}
      <Show when={!isLoaded() && !hasError()}>
        <div class="absolute inset-0 animate-pulse bg-gradient-to-r from-surface-secondary via-surface-tertiary to-surface-secondary" />
      </Show>

      {/* Error state */}
      <Show when={hasError()}>
        <div class="absolute inset-0 flex items-center justify-center bg-surface-secondary">
          <svg class="w-8 h-8 text-white/20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
        </div>
      </Show>

      {/* Actual image */}
      <Show when={isInView()}>
        <img
          ref={imgRef}
          src={props.src}
          alt={props.alt}
          class={`transition-opacity duration-300 ${isLoaded() ? 'opacity-100' : 'opacity-0'}`}
          style={{
            width: '100%',
            height: '100%',
            'object-fit': 'cover',
          }}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      </Show>
    </div>
  );
};

// Artwork specific component with MusicKit URL formatting
interface ArtworkImageProps {
  artwork?: { url: string; width: number; height: number; bgColor?: string };
  size: number;
  alt: string;
  class?: string;
}

export const ArtworkImage: Component<ArtworkImageProps> = (props) => {
  const formatUrl = () => {
    if (!props.artwork?.url) return '';
    return props.artwork.url
      .replace('{w}', String(props.size))
      .replace('{h}', String(props.size));
  };

  const bgColor = () => {
    if (props.artwork?.bgColor) {
      return `#${props.artwork.bgColor}`;
    }
    return '#2c2c2e';
  };

  return (
    <Show
      when={props.artwork?.url}
      fallback={
        <div
          class={`flex items-center justify-center bg-gradient-to-br from-apple-red to-apple-pink ${props.class || ''}`}
          style={{
            width: `${props.size}px`,
            height: `${props.size}px`,
          }}
        >
          <span class="text-white text-2xl">♫</span>
        </div>
      }
    >
      <LazyImage
        src={formatUrl()}
        alt={props.alt}
        width={props.size}
        height={props.size}
        placeholderColor={bgColor()}
        class={props.class}
      />
    </Show>
  );
};

export default LazyImage;
