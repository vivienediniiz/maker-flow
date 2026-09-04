'use client';

import React, { ReactNode } from 'react';

/**
 * ✅ Client-side Error Boundary
 * Catches errors in child components and displays fallback UI
 * Use for isolated error handling (individual features, sections)
 *
 * Example:
 * <ErrorBoundary fallback={<div>Failed to load section</div>}>
 *   <ComplexComponent />
 * </ErrorBoundary>
 */

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to external error tracking service (Sentry, etc.)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="rounded-lg bg-white/5 border border-red-500/30 p-6 text-center">
            <p className="text-sm text-text-secondary">
              Falha ao carregar este componente. Tente recarregar a página.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 cursor-pointer">
                <summary className="text-xs text-red-400 font-mono">
                  Ver erro
                </summary>
                <pre className="mt-2 overflow-auto text-xs text-red-300 bg-black/20 p-2 rounded">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        )
      );
    }

    return this.props.children;
  }
}
