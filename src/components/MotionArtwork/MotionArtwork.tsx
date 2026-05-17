import { Component, createEffect, onCleanup, createSignal } from 'solid-js';
import Hls from 'hls.js';
import { formatArtworkUrl } from '../../lib/musickit';

interface MotionArtworkProps {
  /** Apple `attributes.editorialVideo` object (varies by resource type). */
  editorialVideo?: Record<string, { video?: string; previewFrame?: { url: string; width: number; height: number } }> | null;
  /** Static artwork fallback. */
  artwork?: { url: string; width: number; height: number } | undefined;
  alt?: string;
  /** Fallback image size. */
  size?: number;
  class?: string;
}

// Apple exposes several named motion variants; prefer a square one.
function pickMotion(ev?: MotionArtworkProps['editorialVideo']) {
  if (!ev) return null;
  const entries = Object.entries(ev).filter(([, v]) => v && typeof v.video === 'string');
  if (entries.length === 0) return null;
  const square = entries.find(([k]) => /square|1x1/i.test(k));
  const [, chosen] = square ?? entries[0];
  return chosen ?? null;
}

/**
 * Plays Apple's HLS motion artwork (muted/looped) with a static-image
 * fallback. Chromium has no native HLS, so playback goes through hls.js;
 * if that can't run, the still image is shown.
 */
const MotionArtwork: Component<MotionArtworkProps> = (props) => {
  let videoEl: HTMLVideoElement | undefined;
  const [motionFailed, setMotionFailed] = createSignal(false);

  const motion = () => (motionFailed() ? null : pickMotion(props.editorialVideo));
  const previewUrl = () => motion()?.previewFrame?.url;
  const fallbackSrc = () =>
    previewUrl() ??
    (props.artwork ? formatArtworkUrl(props.artwork as any, props.size ?? 600) : '/placeholder-album.png');

  createEffect(() => {
    const src = motion()?.video;
    const el = videoEl;
    if (!el || !src) return;

    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hls.loadSource(src);
      hls.attachMedia(el);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          setMotionFailed(true);
          hls?.destroy();
        }
      });
    } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = src; // Safari only — not Electron, but harmless
    } else {
      setMotionFailed(true);
      return;
    }
    el.play().catch(() => { /* autoplay blocked — fallback frame stays visible */ });

    onCleanup(() => {
      hls?.destroy();
      if (el) {
        el.removeAttribute('src');
        el.load();
      }
    });
  });

  return (
    <div class={props.class}>
      {motion()?.video ? (
        <video
          ref={videoEl}
          class="w-full h-full object-cover"
          muted
          loop
          autoplay
          playsinline
          poster={fallbackSrc()}
          aria-label={props.alt}
        />
      ) : (
        <img src={fallbackSrc()} alt={props.alt} class="w-full h-full object-cover" />
      )}
    </div>
  );
};

export default MotionArtwork;
