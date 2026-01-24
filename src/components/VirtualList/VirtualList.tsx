/**
 * Virtual List Component
 * Efficiently renders large lists by only rendering visible items
 */

import { Component, For, createSignal, createEffect, onMount, onCleanup, JSX } from 'solid-js';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  overscan?: number;
  containerHeight?: number;
  renderItem: (item: T, index: number) => JSX.Element;
  getKey?: (item: T, index: number) => string | number;
  class?: string;
  onLoadMore?: () => void;
  loadMoreThreshold?: number;
  isLoading?: boolean;
}

export function VirtualList<T>(props: VirtualListProps<T>): JSX.Element {
  let containerRef: HTMLDivElement | undefined;
  const [scrollTop, setScrollTop] = createSignal(0);
  const [containerHeight, setContainerHeight] = createSignal(props.containerHeight || 600);

  const overscan = () => props.overscan ?? 3;

  const totalHeight = () => props.items.length * props.itemHeight;

  const visibleCount = () => Math.ceil(containerHeight() / props.itemHeight) + overscan() * 2;

  const startIndex = () => {
    const index = Math.floor(scrollTop() / props.itemHeight) - overscan();
    return Math.max(0, index);
  };

  const endIndex = () => {
    const end = startIndex() + visibleCount();
    return Math.min(props.items.length, end);
  };

  const visibleItems = () => {
    const start = startIndex();
    const end = endIndex();
    return props.items.slice(start, end).map((item, i) => ({
      item,
      index: start + i,
    }));
  };

  const offsetY = () => startIndex() * props.itemHeight;

  const handleScroll = (e: Event) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);

    // Load more when near bottom
    if (props.onLoadMore && !props.isLoading) {
      const threshold = props.loadMoreThreshold ?? 200;
      const distanceFromBottom = totalHeight() - (target.scrollTop + containerHeight());
      if (distanceFromBottom < threshold) {
        props.onLoadMore();
      }
    }
  };

  onMount(() => {
    if (containerRef && !props.containerHeight) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerHeight(entry.contentRect.height);
        }
      });
      observer.observe(containerRef);
      setContainerHeight(containerRef.clientHeight);

      onCleanup(() => observer.disconnect());
    }
  });

  return (
    <div
      ref={containerRef}
      class={`overflow-y-auto ${props.class || ''}`}
      style={{ height: props.containerHeight ? `${props.containerHeight}px` : '100%' }}
      onScroll={handleScroll}
    >
      <div style={{ height: `${totalHeight()}px`, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY()}px)` }}>
          <For each={visibleItems()}>
            {({ item, index }) => (
              <div
                style={{ height: `${props.itemHeight}px` }}
                data-index={index}
              >
                {props.renderItem(item, index)}
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

// Grid variant for album/playlist grids
interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  gap?: number;
  overscan?: number;
  containerHeight?: number;
  renderItem: (item: T, index: number) => JSX.Element;
  class?: string;
  onLoadMore?: () => void;
  isLoading?: boolean;
}

export function VirtualGrid<T>(props: VirtualGridProps<T>): JSX.Element {
  let containerRef: HTMLDivElement | undefined;
  const [scrollTop, setScrollTop] = createSignal(0);
  const [containerWidth, setContainerWidth] = createSignal(800);
  const [containerHeight, setContainerHeight] = createSignal(props.containerHeight || 600);

  const gap = () => props.gap ?? 16;
  const overscan = () => props.overscan ?? 2;

  const columnsCount = () => Math.max(1, Math.floor((containerWidth() + gap()) / (props.itemWidth + gap())));

  const rowHeight = () => props.itemHeight + gap();

  const rowsCount = () => Math.ceil(props.items.length / columnsCount());

  const totalHeight = () => rowsCount() * rowHeight();

  const visibleRowsCount = () => Math.ceil(containerHeight() / rowHeight()) + overscan() * 2;

  const startRow = () => {
    const row = Math.floor(scrollTop() / rowHeight()) - overscan();
    return Math.max(0, row);
  };

  const endRow = () => {
    const end = startRow() + visibleRowsCount();
    return Math.min(rowsCount(), end);
  };

  const visibleItems = () => {
    const start = startRow() * columnsCount();
    const end = Math.min(props.items.length, endRow() * columnsCount());
    return props.items.slice(start, end).map((item, i) => ({
      item,
      index: start + i,
    }));
  };

  const offsetY = () => startRow() * rowHeight();

  const handleScroll = (e: Event) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);

    // Load more when near bottom
    if (props.onLoadMore && !props.isLoading) {
      const distanceFromBottom = totalHeight() - (target.scrollTop + containerHeight());
      if (distanceFromBottom < 200) {
        props.onLoadMore();
      }
    }
  };

  onMount(() => {
    if (containerRef) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width);
          if (!props.containerHeight) {
            setContainerHeight(entry.contentRect.height);
          }
        }
      });
      observer.observe(containerRef);
      setContainerWidth(containerRef.clientWidth);
      if (!props.containerHeight) {
        setContainerHeight(containerRef.clientHeight);
      }

      onCleanup(() => observer.disconnect());
    }
  });

  return (
    <div
      ref={containerRef}
      class={`overflow-y-auto ${props.class || ''}`}
      style={{ height: props.containerHeight ? `${props.containerHeight}px` : '100%' }}
      onScroll={handleScroll}
    >
      <div style={{ height: `${totalHeight()}px`, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY()}px)`,
            display: 'grid',
            'grid-template-columns': `repeat(${columnsCount()}, ${props.itemWidth}px)`,
            gap: `${gap()}px`,
          }}
        >
          <For each={visibleItems()}>
            {({ item, index }) => (
              <div style={{ height: `${props.itemHeight}px` }}>
                {props.renderItem(item, index)}
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

export default VirtualList;
