import { Component, Show } from 'solid-js';

interface QualityBadgeProps {
  audioTraits?: string[];
  class?: string;
}

const QualityBadge: Component<QualityBadgeProps> = (props) => {
  const badge = () => {
    const traits = props.audioTraits;
    if (!traits || traits.length === 0) return null;

    if (traits.includes('hi-res-lossless')) {
      return { label: 'Hi-Res', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    }
    if (traits.includes('lossless')) {
      return { label: 'Lossless', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    }
    if (traits.includes('atmos') || traits.includes('spatial')) {
      return { label: 'Atmos', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
    }
    return null;
  };

  return (
    <Show when={badge()}>
      {(b) => (
        <span class={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border ${b().color} ${props.class ?? ''}`}>
          {b().label}
        </span>
      )}
    </Show>
  );
};

export default QualityBadge;
