/**
 * Error Boundary Component
 * Catches errors in child components and displays fallback UI
 */

import { Component, ErrorBoundary as SolidErrorBoundary, JSX, createSignal } from 'solid-js';
import { logger } from '../../services/logger';

interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}

const ErrorFallback: Component<ErrorFallbackProps> = (props) => {
  const [showDetails, setShowDetails] = createSignal(false);

  return (
    <div class="flex flex-col items-center justify-center p-8 text-center">
      <div class="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h2 class="text-xl font-semibold text-white mb-2">Something went wrong</h2>
      <p class="text-white/60 mb-6 max-w-md">
        An unexpected error occurred. You can try again or refresh the page.
      </p>

      <div class="flex gap-3 mb-4">
        <button
          onClick={props.reset}
          class="px-4 py-2 bg-apple-red hover:bg-apple-pink text-white font-medium rounded-lg transition-smooth"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          class="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-smooth"
        >
          Refresh Page
        </button>
      </div>

      <button
        onClick={() => setShowDetails(!showDetails())}
        class="text-sm text-white/40 hover:text-white/60 transition-smooth"
      >
        {showDetails() ? 'Hide' : 'Show'} error details
      </button>

      {showDetails() && (
        <div class="mt-4 p-4 bg-surface-secondary rounded-lg text-left max-w-lg overflow-auto">
          <p class="text-sm font-mono text-red-400 mb-2">{props.error.name}: {props.error.message}</p>
          <pre class="text-xs font-mono text-white/40 whitespace-pre-wrap">
            {props.error.stack}
          </pre>
        </div>
      )}
    </div>
  );
};

interface ErrorBoundaryProps {
  children: JSX.Element;
  fallback?: (error: Error, reset: () => void) => JSX.Element;
  onError?: (error: Error) => void;
}

export const AppErrorBoundary: Component<ErrorBoundaryProps> = (props) => {
  const handleError = (error: Error) => {
    logger.error('error-boundary', 'Caught error', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    props.onError?.(error);
  };

  return (
    <SolidErrorBoundary
      fallback={(error, reset) => {
        handleError(error);
        return props.fallback ? props.fallback(error, reset) : <ErrorFallback error={error} reset={reset} />;
      }}
    >
      {props.children}
    </SolidErrorBoundary>
  );
};

// Smaller error boundary for sections
interface SectionErrorFallbackProps {
  error: Error;
  reset: () => void;
  title?: string;
}

const SectionErrorFallback: Component<SectionErrorFallbackProps> = (props) => (
  <div class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
    <div class="flex items-center gap-2 mb-2">
      <svg class="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span class="text-sm font-medium text-red-400">
        {props.title || 'Failed to load'}
      </span>
    </div>
    <p class="text-sm text-white/60 mb-3">{props.error.message}</p>
    <button
      onClick={props.reset}
      class="text-sm text-apple-red hover:underline"
    >
      Try again
    </button>
  </div>
);

interface SectionErrorBoundaryProps {
  children: JSX.Element;
  title?: string;
}

export const SectionErrorBoundary: Component<SectionErrorBoundaryProps> = (props) => (
  <SolidErrorBoundary
    fallback={(error, reset) => (
      <SectionErrorFallback error={error} reset={reset} title={props.title} />
    )}
  >
    {props.children}
  </SolidErrorBoundary>
);

export default AppErrorBoundary;
