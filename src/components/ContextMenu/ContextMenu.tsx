import { Component, For, Show, createSignal, onMount, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  divider?: boolean;
  submenu?: MenuItem[];
  onClick?: () => void;
}

interface ContextMenuProps {
  items: MenuItem[];
  x: number;
  y: number;
  onClose: () => void;
}

const ContextMenu: Component<ContextMenuProps> = (props) => {
  let menuRef: HTMLDivElement | undefined;
  const [submenuId, setSubmenuId] = createSignal<string | null>(null);
  const [submenuPosition, setSubmenuPosition] = createSignal({ x: 0, y: 0 });
  const [position, setPosition] = createSignal({ x: props.x, y: props.y });

  onMount(() => {
    // Adjust position if menu would go off screen
    if (menuRef) {
      const rect = menuRef.getBoundingClientRect();
      const newX = props.x + rect.width > window.innerWidth
        ? window.innerWidth - rect.width - 10
        : props.x;
      const newY = props.y + rect.height > window.innerHeight
        ? window.innerHeight - rect.height - 10
        : props.y;
      setPosition({ x: newX, y: newY });
    }

    // Close on click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef && !menuRef.contains(e.target as Node)) {
        props.onClose();
      }
    };

    // Close on escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        props.onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    onCleanup(() => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    });
  });

  const handleItemClick = (item: MenuItem) => {
    if (item.disabled) return;
    if (item.onClick) {
      item.onClick();
      props.onClose();
    }
  };

  const handleSubmenuEnter = (item: MenuItem, e: MouseEvent) => {
    if (item.submenu) {
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      setSubmenuId(item.id);
      setSubmenuPosition({
        x: rect.right,
        y: rect.top,
      });
    }
  };

  const handleSubmenuLeave = () => {
    setSubmenuId(null);
  };

  return (
    <Portal>
      <div
        ref={menuRef}
        class="fixed z-[100] min-w-[200px] bg-surface-secondary/95 backdrop-blur-xl rounded-lg border border-white/10 shadow-xl overflow-hidden"
        style={{
          left: `${position().x}px`,
          top: `${position().y}px`,
        }}
      >
        <div class="py-1">
          <For each={props.items}>
            {(item) => (
              <>
                <Show when={item.divider}>
                  <div class="my-1 border-t border-white/10" />
                </Show>
                <Show when={!item.divider}>
                  <button
                    onClick={() => handleItemClick(item)}
                    onMouseEnter={(e) => handleSubmenuEnter(item, e)}
                    onMouseLeave={handleSubmenuLeave}
                    disabled={item.disabled}
                    class={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-smooth ${
                      item.disabled
                        ? 'text-white/30 cursor-not-allowed'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <Show when={item.icon}>
                      <span class="w-4 text-center">{item.icon}</span>
                    </Show>
                    <span class="flex-1">{item.label}</span>
                    <Show when={item.submenu}>
                      <svg class="w-4 h-4 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                      </svg>
                    </Show>
                  </button>

                  {/* Submenu */}
                  <Show when={item.submenu && submenuId() === item.id}>
                    <div
                      class="fixed min-w-[180px] bg-surface-secondary/95 backdrop-blur-xl rounded-lg border border-white/10 shadow-xl overflow-hidden"
                      style={{
                        left: `${submenuPosition().x}px`,
                        top: `${submenuPosition().y}px`,
                      }}
                    >
                      <div class="py-1">
                        <For each={item.submenu}>
                          {(subitem) => (
                            <button
                              onClick={() => {
                                if (subitem.onClick) {
                                  subitem.onClick();
                                  props.onClose();
                                }
                              }}
                              disabled={subitem.disabled}
                              class={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-smooth ${
                                subitem.disabled
                                  ? 'text-white/30 cursor-not-allowed'
                                  : 'text-white hover:bg-white/10'
                              }`}
                            >
                              <Show when={subitem.icon}>
                                <span class="w-4 text-center">{subitem.icon}</span>
                              </Show>
                              <span>{subitem.label}</span>
                            </button>
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>
                </Show>
              </>
            )}
          </For>
        </div>
      </div>
    </Portal>
  );
};

export default ContextMenu;

// Hook for using context menu
import { createContext, useContext, JSX } from 'solid-js';

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  items: MenuItem[];
}

const ContextMenuContext = createContext<{
  show: (x: number, y: number, items: MenuItem[]) => void;
  hide: () => void;
}>();

export const ContextMenuProvider: Component<{ children: JSX.Element }> = (props) => {
  const [state, setState] = createSignal<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    items: [],
  });

  const show = (x: number, y: number, items: MenuItem[]) => {
    setState({ isOpen: true, x, y, items });
  };

  const hide = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ContextMenuContext.Provider value={{ show, hide }}>
      {props.children}
      <Show when={state().isOpen}>
        <ContextMenu
          items={state().items}
          x={state().x}
          y={state().y}
          onClose={hide}
        />
      </Show>
    </ContextMenuContext.Provider>
  );
};

export const useContextMenu = () => {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error('useContextMenu must be used within ContextMenuProvider');
  }
  return context;
};

// Helper to create track context menu items
export function createTrackMenuItems(
  track: { id: string; type: string; attributes: { name: string; artistName: string; url?: string } },
  options?: {
    onPlayNext?: () => void;
    onAddToQueue?: () => void;
    onAddToLibrary?: () => void;
    onAddToPlaylist?: () => void;
    onGoToArtist?: () => void;
    onGoToAlbum?: () => void;
    onShare?: () => void;
    onLove?: () => void;
    onRemoveLove?: () => void;
    isLoved?: boolean;
  }
): MenuItem[] {
  const items: MenuItem[] = [];

  if (options?.onPlayNext) {
    items.push({
      id: 'play-next',
      label: 'Play Next',
      icon: '▶',
      onClick: options.onPlayNext,
    });
  }

  if (options?.onAddToQueue) {
    items.push({
      id: 'add-to-queue',
      label: 'Add to Queue',
      icon: '☰',
      onClick: options.onAddToQueue,
    });
  }

  items.push({ id: 'divider-1', label: '', divider: true });

  // Love / Remove Love
  if (options?.onLove || options?.onRemoveLove) {
    if (options?.isLoved && options?.onRemoveLove) {
      items.push({
        id: 'remove-love',
        label: 'Remove Love',
        icon: '♡',
        onClick: options.onRemoveLove,
      });
    } else if (options?.onLove) {
      items.push({
        id: 'love',
        label: 'Love',
        icon: '♥',
        onClick: options.onLove,
      });
    }
  }

  if (options?.onAddToLibrary) {
    items.push({
      id: 'add-to-library',
      label: 'Add to Library',
      icon: '+',
      onClick: options.onAddToLibrary,
    });
  }

  if (options?.onAddToPlaylist) {
    items.push({
      id: 'add-to-playlist',
      label: 'Add to Playlist...',
      icon: '♫',
      onClick: options.onAddToPlaylist,
    });
  }

  items.push({ id: 'divider-2', label: '', divider: true });

  if (options?.onGoToArtist) {
    items.push({
      id: 'go-to-artist',
      label: `Go to Artist`,
      onClick: options.onGoToArtist,
    });
  }

  if (options?.onGoToAlbum) {
    items.push({
      id: 'go-to-album',
      label: 'Go to Album',
      onClick: options.onGoToAlbum,
    });
  }

  if (options?.onShare) {
    items.push({ id: 'divider-3', label: '', divider: true });
    items.push({
      id: 'share',
      label: 'Share',
      icon: '⤴',
      onClick: options.onShare,
    });
  }

  return items;
}
