/**
 * Animated Album Art Background
 * Creates a dynamic, blurred background based on album artwork
 * with subtle animations and color extraction
 */

import { Component, createSignal, createEffect, Show, onCleanup } from 'solid-js';

interface AnimatedBackgroundProps {
  artworkUrl?: string;
  isPlaying?: boolean;
  class?: string;
}

const AnimatedBackground: Component<AnimatedBackgroundProps> = (props) => {
  const [dominantColor, setDominantColor] = createSignal('rgb(30, 30, 30)');
  const [secondaryColor, setSecondaryColor] = createSignal('rgb(20, 20, 20)');
  const [imageLoaded, setImageLoaded] = createSignal(false);
  const [currentUrl, setCurrentUrl] = createSignal('');

  let canvasRef: HTMLCanvasElement | undefined;

  // Extract dominant colors from artwork
  const extractColors = (imageUrl: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      if (!canvasRef) return;

      const ctx = canvasRef.getContext('2d');
      if (!ctx) return;

      // Draw image to canvas
      canvasRef.width = 50;
      canvasRef.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);

      // Get image data
      const imageData = ctx.getImageData(0, 0, 50, 50).data;

      // Simple color extraction - find most common colors
      const colorMap: Record<string, number> = {};

      for (let i = 0; i < imageData.length; i += 16) {
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];

        // Skip very dark or very light colors
        const brightness = (r + g + b) / 3;
        if (brightness < 30 || brightness > 230) continue;

        // Quantize colors
        const qr = Math.round(r / 32) * 32;
        const qg = Math.round(g / 32) * 32;
        const qb = Math.round(b / 32) * 32;

        const key = `${qr},${qg},${qb}`;
        colorMap[key] = (colorMap[key] || 0) + 1;
      }

      // Sort colors by frequency
      const sortedColors = Object.entries(colorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2);

      if (sortedColors.length > 0) {
        const [r, g, b] = sortedColors[0][0].split(',').map(Number);
        // Darken the color for better contrast
        setDominantColor(`rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`);
      }

      if (sortedColors.length > 1) {
        const [r, g, b] = sortedColors[1][0].split(',').map(Number);
        setSecondaryColor(`rgb(${Math.max(0, r - 60)}, ${Math.max(0, g - 60)}, ${Math.max(0, b - 60)})`);
      }

      setImageLoaded(true);
    };
  };

  createEffect(() => {
    if (props.artworkUrl && props.artworkUrl !== currentUrl()) {
      setCurrentUrl(props.artworkUrl);
      setImageLoaded(false);
      // Use a larger image for better color extraction
      const url = props.artworkUrl.replace('{w}', '200').replace('{h}', '200');
      extractColors(url);
    }
  });

  return (
    <div class={`absolute inset-0 overflow-hidden ${props.class || ''}`}>
      {/* Hidden canvas for color extraction */}
      <canvas ref={canvasRef} class="hidden" />

      {/* Gradient background layers */}
      <div
        class="absolute inset-0 transition-all duration-1000 ease-out"
        style={{
          background: `radial-gradient(ellipse at 30% 20%, ${dominantColor()} 0%, transparent 50%)`,
        }}
      />
      <div
        class="absolute inset-0 transition-all duration-1000 ease-out"
        style={{
          background: `radial-gradient(ellipse at 70% 80%, ${secondaryColor()} 0%, transparent 50%)`,
        }}
      />

      {/* Animated blobs */}
      <Show when={props.isPlaying && imageLoaded()}>
        <div
          class="absolute w-[150%] h-[150%] rounded-full blur-3xl opacity-30 animate-blob"
          style={{
            background: dominantColor(),
            top: '-25%',
            left: '-25%',
            'animation-duration': '20s',
          }}
        />
        <div
          class="absolute w-[120%] h-[120%] rounded-full blur-3xl opacity-20 animate-blob"
          style={{
            background: secondaryColor(),
            bottom: '-10%',
            right: '-10%',
            'animation-delay': '-5s',
            'animation-duration': '25s',
          }}
        />
        <div
          class="absolute w-[80%] h-[80%] rounded-full blur-3xl opacity-15 animate-blob"
          style={{
            background: `linear-gradient(45deg, ${dominantColor()}, ${secondaryColor()})`,
            top: '20%',
            left: '30%',
            'animation-delay': '-10s',
            'animation-duration': '30s',
          }}
        />
      </Show>

      {/* Artwork blur overlay */}
      <Show when={props.artworkUrl}>
        <div
          class={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
            imageLoaded() ? 'opacity-20' : 'opacity-0'
          }`}
          style={{
            'background-image': `url(${props.artworkUrl?.replace('{w}', '400').replace('{h}', '400')})`,
            filter: 'blur(100px) saturate(1.5)',
          }}
        />
      </Show>

      {/* Noise texture overlay */}
      <div
        class="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          'background-image': `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette */}
      <div
        class="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.5) 100%)',
        }}
      />
    </div>
  );
};

// Simpler version for mini player
export const MiniBackground: Component<{ artworkUrl?: string }> = (props) => {
  return (
    <div class="absolute inset-0 overflow-hidden">
      <Show when={props.artworkUrl}>
        <div
          class="absolute inset-0 bg-cover bg-center opacity-30 transition-all duration-500"
          style={{
            'background-image': `url(${props.artworkUrl?.replace('{w}', '200').replace('{h}', '200')})`,
            filter: 'blur(50px) saturate(1.2)',
            transform: 'scale(1.5)',
          }}
        />
      </Show>
      <div class="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
    </div>
  );
};

// CSS for blob animation (add to global.css)
export const blobAnimationCSS = `
@keyframes blob {
  0%, 100% {
    transform: translate(0, 0) scale(1) rotate(0deg);
  }
  25% {
    transform: translate(5%, 5%) scale(1.05) rotate(90deg);
  }
  50% {
    transform: translate(-5%, 10%) scale(0.95) rotate(180deg);
  }
  75% {
    transform: translate(10%, -5%) scale(1.02) rotate(270deg);
  }
}

.animate-blob {
  animation: blob 20s ease-in-out infinite;
}
`;

export default AnimatedBackground;
