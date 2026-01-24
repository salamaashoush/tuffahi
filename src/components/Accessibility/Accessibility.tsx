/**
 * Accessibility Components & Utilities
 * Provides a11y enhancements for screen readers and keyboard navigation
 */

import { Component, createSignal, createEffect, onCleanup, Show, JSX } from 'solid-js';

/**
 * Skip to main content link - appears on focus for keyboard users
 */
export const SkipToContent: Component = () => {
  return (
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-apple-red focus:text-white focus:rounded-lg focus:shadow-lg"
    >
      Skip to main content
    </a>
  );
};

/**
 * Live region for screen reader announcements
 */
interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
}

export const LiveRegion: Component<LiveRegionProps> = (props) => {
  return (
    <div
      role="status"
      aria-live={props.priority || 'polite'}
      aria-atomic="true"
      class="sr-only"
    >
      {props.message}
    </div>
  );
};

// Global announcer for dynamic updates
let announcerElement: HTMLDivElement | null = null;

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  if (!announcerElement) {
    announcerElement = document.createElement('div');
    announcerElement.setAttribute('role', 'status');
    announcerElement.setAttribute('aria-live', priority);
    announcerElement.setAttribute('aria-atomic', 'true');
    announcerElement.className = 'sr-only';
    document.body.appendChild(announcerElement);
  }

  // Clear and set to ensure screen readers pick up the change
  announcerElement.textContent = '';
  announcerElement.setAttribute('aria-live', priority);

  // Small delay to ensure the change is registered
  setTimeout(() => {
    if (announcerElement) {
      announcerElement.textContent = message;
    }
  }, 100);
}

/**
 * Focus trap for modals and dialogs
 */
interface FocusTrapProps {
  active: boolean;
  children: JSX.Element;
  onEscape?: () => void;
  initialFocus?: string; // Selector for initial focus element
}

export const FocusTrap: Component<FocusTrapProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let previousActiveElement: Element | null = null;

  const getFocusableElements = (): HTMLElement[] => {
    if (!containerRef) return [];

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    return Array.from(containerRef.querySelectorAll(focusableSelectors));
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.active) return;

    if (e.key === 'Escape' && props.onEscape) {
      props.onEscape();
      return;
    }

    if (e.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  createEffect(() => {
    if (props.active) {
      // Save current focus
      previousActiveElement = document.activeElement;

      // Set initial focus
      setTimeout(() => {
        if (props.initialFocus && containerRef) {
          const initialElement = containerRef.querySelector(props.initialFocus) as HTMLElement;
          initialElement?.focus();
        } else {
          const focusableElements = getFocusableElements();
          focusableElements[0]?.focus();
        }
      }, 50);

      // Add keyboard listener
      document.addEventListener('keydown', handleKeyDown);
    } else {
      // Restore focus
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    }
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div ref={containerRef} data-focus-trap={props.active}>
      {props.children}
    </div>
  );
};

/**
 * Visually hidden but screen reader accessible
 */
export const VisuallyHidden: Component<{ children: JSX.Element }> = (props) => {
  return <span class="sr-only">{props.children}</span>;
};

/**
 * Accessible icon button
 */
interface IconButtonProps {
  onClick: () => void;
  label: string;
  icon: JSX.Element;
  disabled?: boolean;
  class?: string;
}

export const IconButton: Component<IconButtonProps> = (props) => {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      aria-label={props.label}
      title={props.label}
      class={props.class}
    >
      {props.icon}
    </button>
  );
};

/**
 * Progress bar with screen reader support
 */
interface AccessibleProgressProps {
  value: number;
  max: number;
  label: string;
  class?: string;
}

export const AccessibleProgress: Component<AccessibleProgressProps> = (props) => {
  const percentage = () => Math.round((props.value / props.max) * 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={props.value}
      aria-valuemin={0}
      aria-valuemax={props.max}
      aria-label={props.label}
      aria-valuetext={`${percentage()}%`}
      class={props.class}
    >
      <div
        class="h-full bg-apple-red transition-all"
        style={{ width: `${percentage()}%` }}
      />
    </div>
  );
};

/**
 * Keyboard navigation hint
 */
export const KeyboardHint: Component<{ keys: string[]; action: string }> = (props) => {
  return (
    <div class="flex items-center gap-2 text-xs text-white/40">
      <div class="flex gap-1">
        {props.keys.map((key) => (
          <kbd class="px-1.5 py-0.5 bg-surface-secondary rounded text-white/60 font-mono">
            {key}
          </kbd>
        ))}
      </div>
      <span>{props.action}</span>
    </div>
  );
};

/**
 * Roving tabindex for list navigation
 */
export function useRovingTabIndex(itemCount: () => number) {
  const [focusedIndex, setFocusedIndex] = createSignal(0);

  const handleKeyDown = (e: KeyboardEvent) => {
    const count = itemCount();
    if (count === 0) return;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % count);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + count) % count);
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(count - 1);
        break;
    }
  };

  const getTabIndex = (index: number) => (index === focusedIndex() ? 0 : -1);

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    getTabIndex,
  };
}

/**
 * Reduced motion preference hook
 */
export function usePrefersReducedMotion(): () => boolean {
  const [prefersReduced, setPrefersReduced] = createSignal(false);

  createEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener('change', handler);

    onCleanup(() => mediaQuery.removeEventListener('change', handler));
  });

  return prefersReduced;
}

// CSS classes to add to global.css
export const accessibilityCSS = `
/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Focus visible styles */
:focus-visible {
  outline: 2px solid var(--color-primary, #fa2d48);
  outline-offset: 2px;
}

/* Remove focus ring for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* High contrast mode support */
@media (prefers-contrast: more) {
  :root {
    --color-text-secondary: rgba(255, 255, 255, 0.8);
    --color-text-muted: rgba(255, 255, 255, 0.6);
  }

  button, a {
    border: 1px solid currentColor;
  }
}
`;

export default {
  SkipToContent,
  LiveRegion,
  FocusTrap,
  VisuallyHidden,
  IconButton,
  AccessibleProgress,
  KeyboardHint,
  announce,
  useRovingTabIndex,
  usePrefersReducedMotion,
};
