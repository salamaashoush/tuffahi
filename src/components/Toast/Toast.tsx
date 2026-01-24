/**
 * Toast Notification System
 * Non-blocking notifications for user feedback
 */

import { Component, createSignal, For, Show, onCleanup } from 'solid-js';
import { Info, CheckCircle, AlertTriangle, AlertCircle, X } from 'lucide-solid';
import type { Toast as ToastType } from '../../types';

// Toast store
const [toasts, setToasts] = createSignal<ToastType[]>([]);

// Add a toast
export function showToast(toast: Omit<ToastType, 'id'>): string {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const newToast: ToastType = {
    ...toast,
    id,
    duration: toast.duration ?? 3000,
  };

  setToasts((prev) => [...prev, newToast]);

  // Auto-remove after duration
  if (newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);
  }

  return id;
}

// Remove a toast
export function removeToast(id: string): void {
  setToasts((prev) => prev.filter((t) => t.id !== id));
}

// Clear all toasts
export function clearToasts(): void {
  setToasts([]);
}

// Convenience methods
export const toast = {
  info: (title: string, message?: string) =>
    showToast({ type: 'info', title, message }),
  success: (title: string, message?: string) =>
    showToast({ type: 'success', title, message }),
  warning: (title: string, message?: string) =>
    showToast({ type: 'warning', title, message }),
  error: (title: string, message?: string) =>
    showToast({ type: 'error', title, message, duration: 5000 }),
};

// Icon component for toast types
const ToastIcon: Component<{ type: ToastType['type'] }> = (props) => {
  const icons = {
    info: <Info size={20} />,
    success: <CheckCircle size={20} />,
    warning: <AlertTriangle size={20} />,
    error: <AlertCircle size={20} />,
  };

  return icons[props.type];
};

// Individual toast component
const ToastItem: Component<{ toast: ToastType; onClose: () => void }> = (props) => {
  const [isExiting, setIsExiting] = createSignal(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      props.onClose();
    }, 300);
  };

  const typeStyles = {
    info: 'border-blue-500 bg-blue-500/10',
    success: 'border-green-500 bg-green-500/10',
    warning: 'border-yellow-500 bg-yellow-500/10',
    error: 'border-red-500 bg-red-500/10',
  };

  const iconColors = {
    info: 'text-blue-500',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
  };

  return (
    <div
      class={`flex items-start gap-3 p-4 rounded-lg border-l-4 bg-surface shadow-lg max-w-sm backdrop-blur-xl ${
        typeStyles[props.toast.type]
      } ${isExiting() ? 'animate-toast-out' : 'animate-toast-in'}`}
    >
      <div class={iconColors[props.toast.type]}>
        <ToastIcon type={props.toast.type} />
      </div>

      <div class="flex-1 min-w-0">
        <div class="font-medium text-white">{props.toast.title}</div>
        <Show when={props.toast.message}>
          <div class="text-sm text-white/60 mt-1">{props.toast.message}</div>
        </Show>
        <Show when={props.toast.action}>
          <button
            onClick={() => {
              props.toast.action?.onClick();
              handleClose();
            }}
            class="text-sm font-medium text-apple-red hover:text-apple-pink mt-2"
          >
            {props.toast.action?.label}
          </button>
        </Show>
      </div>

      <button
        onClick={handleClose}
        class="text-white/40 hover:text-white transition-colors"
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

// Toast container component - mount this in App.tsx
export const ToastContainer: Component = () => {
  return (
    <div
      class="fixed bottom-20 right-4 z-[9999] flex flex-col gap-2"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      <For each={toasts()}>
        {(toast) => (
          <ToastItem toast={toast} onClose={() => removeToast(toast.id)} />
        )}
      </For>
    </div>
  );
};

export default ToastContainer;
