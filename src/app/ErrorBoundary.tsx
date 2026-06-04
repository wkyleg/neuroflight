import { Component, type ErrorInfo, type ReactNode } from 'react';
import logger from '@/neuro/logger.ts';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('React', 'Screen render failed', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center px-8 text-center"
          style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
        >
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: '#facc15' }}>
            NeuroFlight paused this screen
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6" style={{ color: 'rgba(240,236,224,0.72)' }}>
            Something went wrong while rendering. Your browser console has a downloadable debug log.
          </p>
          <button
            type="button"
            className="glass-button mt-8 rounded-lg px-8 py-4"
            onClick={() => {
              this.setState({ error: null });
              window.location.hash = '#/';
            }}
          >
            Back to menu
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
